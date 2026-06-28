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
  const [ags, pedidos, pacotes, subs] = await Promise.all([
    prisma.appointment.findMany({
      where: { status: "concluido", criadoEm: { gte: desde, lt: ate } },
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
  const ags = await prisma.appointment.groupBy({
    by: ["status"],
    where: { criadoEm: { gte: desde, lt: ate } },
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
  const [ags, pedidos] = await Promise.all([
    prisma.appointment.findMany({
      where: { status: "concluido", criadoEm: { gte: desde, lt: ate } },
      select: { criadoEm: true, valorTotal: true },
    }),
    prisma.order.findMany({
      where: { statusPagamento: "pago", criadoEm: { gte: desde, lt: ate } },
      select: { criadoEm: true, total: true },
    }),
  ]);

  const mapa = new Map<string, { servicos: number; loja: number }>();
  const cursor = new Date(desde);
  cursor.setHours(0, 0, 0, 0);
  while (cursor < ate) {
    mapa.set(chaveDia(cursor), { servicos: 0, loja: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const a of ags) {
    const e = mapa.get(chaveDia(a.criadoEm));
    if (e) e.servicos += dec(a.valorTotal);
  }
  for (const p of pedidos) {
    const e = mapa.get(chaveDia(p.criadoEm));
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
