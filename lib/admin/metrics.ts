import { prisma } from "@/lib/prisma";

// ─── Métricas do painel ─────────────────────────────────────────────────────
// Cálculos de receita/atendimento reusados pelo dashboard e pelo financeiro.
// Receita = agendamentos concluídos + pedidos pagos. Mensalistas entram pelo
// que já foi cortado (atendimentos), então não há dupla contagem aqui.

export type Periodo = "dia" | "semana" | "mes" | "ano";

export function inicioPeriodo(p: Periodo, ref = new Date()): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  if (p === "dia") return d;
  if (p === "semana") {
    const dow = d.getDay();
    const diff = (dow + 6) % 7; // semana começa na segunda
    d.setDate(d.getDate() - diff);
    return d;
  }
  if (p === "mes") return new Date(d.getFullYear(), d.getMonth(), 1);
  return new Date(d.getFullYear(), 0, 1);
}

function dec(v: { toString(): string } | null | undefined): number {
  return v ? parseFloat(v.toString()) : 0;
}

// O campo Appointment.data é `@db.Date` → Prisma entrega meia-noite UTC. Para
// filtrar/agrupar por dia do corte sem off-by-one de timezone, derivamos uma
// janela UTC do mês (a partir do `desde` local que carrega ano/mês) e lemos a
// data com getters UTC. Mês corrente não conta dias futuros.
export function janelaData(refLocal: Date): { desde: Date; ate: Date } {
  const ano = refLocal.getFullYear();
  const mes = refLocal.getMonth();
  const desde = new Date(Date.UTC(ano, mes, 1));
  const fimMes = new Date(Date.UTC(ano, mes + 1, 1));
  const now = new Date();
  const amanha = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return { desde, ate: fimMes < amanha ? fimMes : amanha };
}

function chaveDiaUTC(d: Date): string {
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${mes}-${dia}`;
}

export type ResumoReceita = {
  servicos: number;
  loja: number;
  total: number;
  atendimentos: number;
  ticketMedio: number;
};

// Receita de uma janela [desde, ate).
export async function receitaNoPeriodo(
  desde: Date,
  ate: Date = new Date()
): Promise<ResumoReceita> {
  const [ags, pedidos] = await Promise.all([
    prisma.appointment.findMany({
      where: { status: "concluido", criadoEm: { gte: desde, lt: ate } },
      select: { valorTotal: true },
    }),
    prisma.order.findMany({
      where: { statusPagamento: "pago", criadoEm: { gte: desde, lt: ate } },
      select: { total: true },
    }),
  ]);
  const servicos = ags.reduce((s, a) => s + dec(a.valorTotal), 0);
  const loja = pedidos.reduce((s, p) => s + dec(p.total), 0);
  const atendimentos = ags.length;
  return {
    servicos,
    loja,
    total: servicos + loja,
    atendimentos,
    ticketMedio: atendimentos ? servicos / atendimentos : 0,
  };
}

// Receita por fonte numa janela: serviços, loja, assinaturas (pacotes vendidos),
// mensalistas (pagamentos de ciclo registrados).
export type ReceitaPorFonte = {
  servicos: number;
  loja: number;
  assinaturas: number;
  mensalistas: number;
  total: number;
};

export async function receitaPorFonte(
  desde: Date,
  ate: Date = new Date()
): Promise<ReceitaPorFonte> {
  const jd = janelaData(desde);
  const [ags, pedidos, pacotes, subs] = await Promise.all([
    prisma.appointment.findMany({
      where: { status: "concluido", data: { gte: jd.desde, lt: jd.ate } },
      select: { valorTotal: true },
    }),
    prisma.order.findMany({
      where: { statusPagamento: "pago", criadoEm: { gte: desde, lt: ate } },
      select: { total: true },
    }),
    prisma.clientPackage.findMany({
      where: { compradoEm: { gte: desde, lt: ate } },
      select: { pacote: { select: { preco: true } } },
    }),
    prisma.subscription.findMany({
      where: { dataUltimoPagamento: { gte: desde, lt: ate } },
      select: { valorUltimoPagamento: true },
    }),
  ]);
  const servicos = ags.reduce((s, a) => s + dec(a.valorTotal), 0);
  const loja = pedidos.reduce((s, p) => s + dec(p.total), 0);
  const assinaturas = pacotes.reduce((s, p) => s + dec(p.pacote.preco), 0);
  const mensalistas = subs.reduce((s, x) => s + dec(x.valorUltimoPagamento), 0);
  return {
    servicos,
    loja,
    assinaturas,
    mensalistas,
    total: servicos + loja + assinaturas + mensalistas,
  };
}

export type ResumoAtendimento = {
  agendados: number;
  concluidos: number;
  cancelados: number;
  naoComparecimentos: number;
  taxaOcupacao: number; // concluidos / total não-cancelado
  taxaNoShow: number;
};

export async function atendimentoNoPeriodo(
  desde: Date,
  ate: Date = new Date()
): Promise<ResumoAtendimento> {
  const jd = janelaData(desde);
  const ags = await prisma.appointment.groupBy({
    by: ["status"],
    where: { data: { gte: jd.desde, lt: jd.ate } },
    _count: { _all: true },
  });
  const por = (s: string) =>
    ags.find((g) => g.status === s)?._count._all ?? 0;
  const agendados = por("agendado");
  const concluidos = por("concluido");
  const cancelados = por("cancelado");
  const naoComparecimentos = por("nao_compareceu");
  const baseOcup = concluidos + agendados + naoComparecimentos;
  return {
    agendados,
    concluidos,
    cancelados,
    naoComparecimentos,
    taxaOcupacao: baseOcup ? concluidos / baseOcup : 0,
    taxaNoShow: baseOcup ? naoComparecimentos / baseOcup : 0,
  };
}

// Janela [início, fim) de um mês (mesIndex 0..11). `fim` é capado em "agora"
// quando o mês é o corrente — não conta dias futuros.
export function janelaMes(ano: number, mesIndex: number): { desde: Date; ate: Date } {
  const desde = new Date(ano, mesIndex, 1);
  const fimMes = new Date(ano, mesIndex + 1, 1);
  const agora = new Date();
  return { desde, ate: fimMes < agora ? fimMes : agora };
}

// Série de receita por dia dentro de um intervalo (para gráfico de área).
export async function serieReceitaPorDia(
  desde: Date,
  ate: Date
): Promise<{ data: string; servicos: number; loja: number }[]> {
  const jd = janelaData(desde);
  const [ags, pedidos] = await Promise.all([
    prisma.appointment.findMany({
      where: { status: "concluido", data: { gte: jd.desde, lt: jd.ate } },
      select: { data: true, valorTotal: true },
    }),
    prisma.order.findMany({
      where: { statusPagamento: "pago", criadoEm: { gte: desde, lt: ate } },
      select: { criadoEm: true, total: true },
    }),
  ]);

  // Eixo do dia em UTC (alinha com Appointment.data @db.Date). Pedidos contam
  // pelo dia UTC do criadoEm — alinhamento visual no mesmo eixo.
  const mapa = new Map<string, { servicos: number; loja: number }>();
  const cursor = new Date(jd.desde);
  while (cursor < jd.ate) {
    mapa.set(chaveDiaUTC(cursor), { servicos: 0, loja: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  for (const a of ags) {
    const e = mapa.get(chaveDiaUTC(a.data));
    if (e) e.servicos += dec(a.valorTotal);
  }
  for (const p of pedidos) {
    const e = mapa.get(chaveDiaUTC(p.criadoEm));
    if (e) e.loja += dec(p.total);
  }
  return Array.from(mapa.entries()).map(([data, v]) => ({ data, ...v }));
}

// Novos clientes cadastrados na janela.
export async function novosClientes(desde: Date, ate: Date): Promise<number> {
  return prisma.client.count({ where: { criadoEm: { gte: desde, lt: ate } } });
}

// Próximos atendimentos agendados (de hoje em diante).
export async function proximosAtendimentos(limite = 5): Promise<
  {
    id: string;
    data: string;
    horarioInicio: string;
    cliente: string;
    servicos: string[];
    valorTotal: number;
  }[]
> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ags = await prisma.appointment.findMany({
    where: { status: "agendado", data: { gte: hoje } },
    include: {
      cliente: { select: { nome: true } },
      servicos: { include: { servico: { select: { nome: true } } } },
    },
    orderBy: [{ data: "asc" }, { horarioInicio: "asc" }],
    take: limite,
  });
  return ags.map((a) => ({
    id: a.id,
    data: a.data.toISOString().slice(0, 10),
    horarioInicio: a.horarioInicio,
    cliente: a.cliente.nome,
    servicos: a.servicos.map((s) => s.servico.nome),
    valorTotal: dec(a.valorTotal),
  }));
}

// Série de receita por dia nos últimos N dias (para gráfico de linha/área).
export async function serieReceitaDiaria(
  dias = 30
): Promise<{ data: string; servicos: number; loja: number }[]> {
  const desde = new Date();
  desde.setHours(0, 0, 0, 0);
  desde.setDate(desde.getDate() - (dias - 1));

  const [ags, pedidos] = await Promise.all([
    prisma.appointment.findMany({
      where: { status: "concluido", criadoEm: { gte: desde } },
      select: { criadoEm: true, valorTotal: true },
    }),
    prisma.order.findMany({
      where: { statusPagamento: "pago", criadoEm: { gte: desde } },
      select: { criadoEm: true, total: true },
    }),
  ]);

  const mapa = new Map<string, { servicos: number; loja: number }>();
  for (let i = 0; i < dias; i++) {
    const d = new Date(desde);
    d.setDate(desde.getDate() + i);
    mapa.set(chaveDia(d), { servicos: 0, loja: 0 });
  }
  for (const a of ags) {
    const k = chaveDia(a.criadoEm);
    const e = mapa.get(k);
    if (e) e.servicos += dec(a.valorTotal);
  }
  for (const p of pedidos) {
    const k = chaveDia(p.criadoEm);
    const e = mapa.get(k);
    if (e) e.loja += dec(p.total);
  }
  return Array.from(mapa.entries()).map(([data, v]) => ({ data, ...v }));
}

function chaveDia(d: Date): string {
  const x = new Date(d);
  const ano = x.getFullYear();
  const mes = String(x.getMonth() + 1).padStart(2, "0");
  const dia = String(x.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// Serviços mais vendidos (contagem em agendamentos concluídos).
export async function servicosMaisVendidos(
  limite = 6
): Promise<{ nome: string; total: number }[]> {
  const linhas = await prisma.appointmentService.findMany({
    where: { agendamento: { status: "concluido" } },
    select: { servico: { select: { nome: true } } },
  });
  const cont = new Map<string, number>();
  for (const l of linhas) {
    cont.set(l.servico.nome, (cont.get(l.servico.nome) ?? 0) + 1);
  }
  return Array.from(cont.entries())
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limite);
}

// Ocupação por hora do dia (heatmap simples / barras): quantos agendamentos
// por horário de início.
export async function ocupacaoPorHora(): Promise<
  { hora: string; total: number }[]
> {
  const ags = await prisma.appointment.findMany({
    where: { status: { in: ["concluido", "agendado"] } },
    select: { horarioInicio: true },
  });
  const cont = new Map<string, number>();
  for (const a of ags) {
    cont.set(a.horarioInicio, (cont.get(a.horarioInicio) ?? 0) + 1);
  }
  return Array.from(cont.entries())
    .map(([hora, total]) => ({ hora, total }))
    .sort((a, b) => a.hora.localeCompare(b.hora));
}

// ─── Insights (camada secundária do financeiro) ─────────────────────────────

export type RankItem = { nome: string; qtd: number; receita: number };

// Serviços por receita numa janela (concluídos).
export async function rankingServicos(
  desde: Date,
  ate: Date,
  limite = 8
): Promise<RankItem[]> {
  const jd = janelaData(desde);
  const linhas = await prisma.appointmentService.findMany({
    where: { agendamento: { status: "concluido", data: { gte: jd.desde, lt: jd.ate } } },
    select: { precoNaHora: true, servico: { select: { nome: true } } },
  });
  const m = new Map<string, { qtd: number; receita: number }>();
  for (const l of linhas) {
    const e = m.get(l.servico.nome) ?? { qtd: 0, receita: 0 };
    e.qtd += 1;
    e.receita += dec(l.precoNaHora);
    m.set(l.servico.nome, e);
  }
  return Array.from(m.entries())
    .map(([nome, v]) => ({ nome, ...v }))
    .sort((a, b) => b.receita - a.receita)
    .slice(0, limite);
}

// Produtos por receita numa janela (pedidos pagos).
export async function rankingProdutos(
  desde: Date,
  ate: Date,
  limite = 8
): Promise<RankItem[]> {
  const linhas = await prisma.orderItem.findMany({
    where: { pedido: { statusPagamento: "pago", criadoEm: { gte: desde, lt: ate } } },
    select: { quantidade: true, precoNaHora: true, produto: { select: { nome: true } } },
  });
  const m = new Map<string, { qtd: number; receita: number }>();
  for (const l of linhas) {
    const e = m.get(l.produto.nome) ?? { qtd: 0, receita: 0 };
    e.qtd += l.quantidade;
    e.receita += dec(l.precoNaHora) * l.quantidade;
    m.set(l.produto.nome, e);
  }
  return Array.from(m.entries())
    .map(([nome, v]) => ({ nome, ...v }))
    .sort((a, b) => b.receita - a.receita)
    .slice(0, limite);
}

// Ocupação por hora numa janela (concluídos).
export async function ocupacaoPorHoraJanela(
  desde: Date,
  ate: Date
): Promise<{ hora: string; total: number }[]> {
  const jd = janelaData(desde);
  const ags = await prisma.appointment.findMany({
    where: { status: "concluido", data: { gte: jd.desde, lt: jd.ate } },
    select: { horarioInicio: true },
  });
  const cont = new Map<string, number>();
  for (const a of ags) cont.set(a.horarioInicio, (cont.get(a.horarioInicio) ?? 0) + 1);
  return Array.from(cont.entries())
    .map(([hora, total]) => ({ hora, total }))
    .sort((a, b) => a.hora.localeCompare(b.hora));
}

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

// Atendimentos por dia da semana numa janela (concluídos), usando a data do corte.
export async function ocupacaoPorDiaSemana(
  desde: Date,
  ate: Date
): Promise<{ dia: string; total: number }[]> {
  const jd = janelaData(desde);
  const ags = await prisma.appointment.findMany({
    where: { status: "concluido", data: { gte: jd.desde, lt: jd.ate } },
    select: { data: true },
  });
  const cont = new Array(7).fill(0);
  for (const a of ags) cont[a.data.getUTCDay()]++;
  // ordem seg..sáb (barbearia fecha dom/seg, mas mantemos todos pra contexto)
  const ordem = [1, 2, 3, 4, 5, 6, 0];
  return ordem.map((i) => ({ dia: DIAS[i], total: cont[i] }));
}

// Recorrência: dos clientes atendidos na janela, quantos têm >1 atendimento
// concluído no histórico total. Retorna taxa (0..1).
export async function recorrencia(
  desde: Date,
  ate: Date
): Promise<{ recorrentes: number; total: number; taxa: number }> {
  const jd = janelaData(desde);
  const ags = await prisma.appointment.findMany({
    where: { status: "concluido", data: { gte: jd.desde, lt: jd.ate } },
    select: { clienteId: true },
  });
  const clientesJanela = Array.from(new Set(ags.map((a) => a.clienteId)));
  if (!clientesJanela.length) return { recorrentes: 0, total: 0, taxa: 0 };
  const cont = await prisma.appointment.groupBy({
    by: ["clienteId"],
    where: { status: "concluido", clienteId: { in: clientesJanela } },
    _count: { _all: true },
  });
  const recorrentes = cont.filter((c) => c._count._all > 1).length;
  const total = clientesJanela.length;
  return { recorrentes, total, taxa: total ? recorrentes / total : 0 };
}
