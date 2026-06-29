import { prisma } from "@/lib/prisma";
import { janelaMes, receitaPorFonte, serieReceitaPorDia } from "./metrics";
import type { ExpenseCategory, ExpenseStatus, TaxMode } from "@prisma/client";

// ─── Contabilidade ──────────────────────────────────────────────────────────
// Custos/lucro do mês. Receita vem de metrics.ts (não recriar). Despesas
// recorrentes são moldes que aparecem virtualmente em cada mês até serem
// editadas (override-on-edit) — ver despesasDoMes.

const dec = (v: { toString(): string } | null | undefined): number =>
  v ? parseFloat(v.toString()) : 0;

// Categorias de despesa (fonte única; espelha enum ExpenseCategory do schema).
export const CATEGORIAS: ExpenseCategory[] = [
  "aluguel",
  "agua",
  "luz",
  "internet",
  "produtos",
  "funcionarios",
  "impostos",
  "manutencao",
  "marketing",
  "outros",
];

export function parseMes(mes: string | null | undefined): { ano: number; mesIndex: number } {
  const agora = new Date();
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [a, m] = mes.split("-").map(Number);
    if (m >= 1 && m <= 12) return { ano: a, mesIndex: m - 1 };
  }
  return { ano: agora.getUTCFullYear(), mesIndex: agora.getUTCMonth() };
}

// "YYYY-MM-DD" → Date UTC meia-noite (p/ gravar em @db.Date). Inválido → hoje.
export function dataUTC(ymd: string | null | undefined): Date {
  if (ymd && /^\d{4}-\d{2}-\d{2}$/.test(ymd)) return new Date(`${ymd}T00:00:00.000Z`);
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

// Mês [1º dia, 1º do próximo) em UTC — alinha com Expense.data @db.Date.
function janelaMesUTC(ano: number, mesIndex: number): { desde: Date; ate: Date } {
  return {
    desde: new Date(Date.UTC(ano, mesIndex, 1)),
    ate: new Date(Date.UTC(ano, mesIndex + 1, 1)),
  };
}

const chaveDiaUTC = (d: Date): string => d.toISOString().slice(0, 10);

export type DespesaItem = {
  id: string; // uuid real OU "rec:<moldeId>:<YYYY-MM>" para molde virtual
  nome: string;
  categoria: ExpenseCategory;
  valor: number;
  data: string; // YYYY-MM-DD
  status: ExpenseStatus;
  observacao: string | null;
  recorrenteId: string | null;
  virtual: boolean; // molde recorrente sem override neste mês
  fixo: boolean; // origem recorrente (override real ou virtual)
  variavel: boolean; // recorrente de valor variável (estimativa a confirmar)
};

// Despesas efetivas de um mês: lançamentos reais + moldes recorrentes ativos
// que ainda não têm override naquele mês (linha virtual com valor padrão).
export async function despesasDoMes(ano: number, mesIndex: number): Promise<DespesaItem[]> {
  const { desde, ate } = janelaMesUTC(ano, mesIndex);
  const ultimoDia = new Date(ate.getTime() - 86400000); // último dia do mês (UTC)
  const mesChave = `${ano}-${String(mesIndex + 1).padStart(2, "0")}`;

  const [reais, moldes] = await Promise.all([
    prisma.expense.findMany({ where: { data: { gte: desde, lt: ate } }, orderBy: { data: "asc" } }),
    prisma.recurringExpense.findMany({ where: { ativo: true, dataInicio: { lte: ultimoDia } } }),
  ]);

  const moldesComOverride = new Set(reais.map((e) => e.recorrenteId).filter(Boolean) as string[]);

  const itensReais: DespesaItem[] = reais.map((e) => ({
    id: e.id,
    nome: e.nome,
    categoria: e.categoria,
    valor: dec(e.valor),
    data: chaveDiaUTC(e.data),
    status: e.status,
    observacao: e.observacao,
    recorrenteId: e.recorrenteId,
    virtual: false,
    fixo: !!e.recorrenteId,
    variavel: false,
  }));

  const virtuais: DespesaItem[] = moldes
    .filter((m) => !moldesComOverride.has(m.id))
    .map((m) => {
      const dia = Math.min(Math.max(m.diaVencimento ?? 1, 1), ultimoDia.getUTCDate());
      return {
        id: `rec:${m.id}:${mesChave}`,
        nome: m.nome,
        categoria: m.categoria,
        valor: dec(m.valor),
        data: `${mesChave}-${String(dia).padStart(2, "0")}`,
        status: "pendente" as ExpenseStatus,
        observacao: m.observacao,
        recorrenteId: m.id,
        virtual: true,
        fixo: true,
        variavel: m.variavel,
      };
    });

  return [...itensReais, ...virtuais].sort((a, b) => a.data.localeCompare(b.data));
}

function calcImposto(
  receita: number,
  cfg: { modo: TaxMode; taxa: number; valorFixo: number } | null
): number {
  if (!cfg || cfg.modo === "nenhum") return 0;
  if (cfg.modo === "percentual") return (receita * cfg.taxa) / 100;
  return cfg.valorFixo;
}

export type ResumoContabil = {
  receitaBruta: number;
  ajustesEntrada: number;
  ajustesSaida: number;
  despesasTotais: number;
  custoFixo: number;
  custoVariavel: number;
  imposto: number;
  custoOperacional: number;
  lucroLiquido: number;
  margemLiquida: number; // 0..1
  breakEven: number | null; // receita necessária p/ lucro zero, null se indefinido
};

export async function resumoContabil(ano: number, mesIndex: number): Promise<ResumoContabil> {
  const { desde, ate } = janelaMes(ano, mesIndex);
  const { desde: dUTC, ate: aUTC } = janelaMesUTC(ano, mesIndex);

  const [fonte, despesas, ajustes, cfgRow] = await Promise.all([
    receitaPorFonte(desde, ate),
    despesasDoMes(ano, mesIndex),
    prisma.accountingAdjustment.findMany({ where: { data: { gte: dUTC, lt: aUTC } } }),
    prisma.taxSetting.findUnique({ where: { id: "default" } }),
  ]);

  const cfg = cfgRow
    ? { modo: cfgRow.modo, taxa: dec(cfgRow.taxa), valorFixo: dec(cfgRow.valorFixo) }
    : null;

  const receitaBruta = fonte.total;
  const ajustesEntrada = ajustes.filter((a) => a.tipo === "entrada").reduce((s, a) => s + dec(a.valor), 0);
  const ajustesSaida = ajustes.filter((a) => a.tipo === "saida").reduce((s, a) => s + dec(a.valor), 0);

  const despesasTotais = despesas.reduce((s, d) => s + d.valor, 0);
  const custoFixo = despesas.filter((d) => d.fixo).reduce((s, d) => s + d.valor, 0);
  const custoVariavel = despesasTotais - custoFixo;

  const imposto = calcImposto(receitaBruta, cfg);
  const custoOperacional = despesasTotais + imposto;
  const lucroLiquido = receitaBruta + ajustesEntrada - ajustesSaida - despesasTotais - imposto;
  const margemLiquida = receitaBruta > 0 ? lucroLiquido / receitaBruta : 0;

  // Break-even = custo fixo / margem de contribuição. Indefinido se receita 0
  // ou margem de contribuição ≤ 0. ponytail: fórmula clássica, sem custeio por unidade.
  const margemContrib = receitaBruta > 0 ? 1 - custoVariavel / receitaBruta : 0;
  const breakEven = receitaBruta > 0 && margemContrib > 0 ? custoFixo / margemContrib : null;

  return {
    receitaBruta,
    ajustesEntrada,
    ajustesSaida,
    despesasTotais,
    custoFixo,
    custoVariavel,
    imposto,
    custoOperacional,
    lucroLiquido,
    margemLiquida,
    breakEven,
  };
}

// Despesas agrupadas por categoria (para gráfico de barras).
export async function despesasPorCategoria(
  ano: number,
  mesIndex: number
): Promise<{ categoria: ExpenseCategory; total: number }[]> {
  const itens = await despesasDoMes(ano, mesIndex);
  const m = new Map<ExpenseCategory, number>();
  for (const d of itens) m.set(d.categoria, (m.get(d.categoria) ?? 0) + d.valor);
  return Array.from(m.entries())
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);
}

// Fluxo de caixa por dia: entradas (receita serviços+loja + ajustes entrada) vs
// saídas (despesas + ajustes saída). ponytail: entradas usam série de
// serviços+loja (sem assinaturas/mensalistas) — alinhada ao gráfico do Resumo.
export async function fluxoDeCaixaPorDia(
  ano: number,
  mesIndex: number
): Promise<{ dia: string; entradas: number; saidas: number }[]> {
  const { desde, ate } = janelaMes(ano, mesIndex);
  const { desde: dUTC, ate: aUTC } = janelaMesUTC(ano, mesIndex);

  const [serie, despesas, ajustes] = await Promise.all([
    serieReceitaPorDia(desde, ate),
    despesasDoMes(ano, mesIndex),
    prisma.accountingAdjustment.findMany({ where: { data: { gte: dUTC, lt: aUTC } } }),
  ]);

  const mapa = new Map<string, { entradas: number; saidas: number }>();
  for (const s of serie) mapa.set(s.data, { entradas: s.servicos + s.loja, saidas: 0 });
  const get = (k: string) => {
    let e = mapa.get(k);
    if (!e) {
      e = { entradas: 0, saidas: 0 };
      mapa.set(k, e);
    }
    return e;
  };
  for (const d of despesas) get(d.data).saidas += d.valor;
  for (const a of ajustes) {
    const k = chaveDiaUTC(a.data);
    if (a.tipo === "entrada") get(k).entradas += dec(a.valor);
    else get(k).saidas += dec(a.valor);
  }

  return Array.from(mapa.entries())
    .map(([dia, v]) => ({ dia, ...v }))
    .sort((a, b) => a.dia.localeCompare(b.dia));
}
