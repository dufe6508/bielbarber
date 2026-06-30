import type { Prisma, ChargeMethod, SubscriptionCharge } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications/notify";
import { criarPreferencia } from "@/lib/mercadopago";
import { ativarPacote } from "@/lib/packages";

// ─── Motor de cobrança de mensalidade ───────────────────────────────────────
// Centraliza emissão, confirmação, vencimento e cancelamento de cobranças.
// O financeiro permanece consistente com o fluxo legado: ao confirmar, gravamos
// subscription.dataUltimoPagamento/valorUltimoPagamento e reiniciamos o ciclo —
// exatamente como a antiga ação "marcar_pago" do painel.

export type ItemCobranca = {
  id: string; // appointmentId
  data: string; // YYYY-MM-DD
  servicos: string[];
  valor: number;
};

// Próxima data de fechamento a partir do dia (10/30). Igual às rotas existentes.
export function proximaCobranca(dia: number, ref = new Date()): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), dia);
  if (d <= ref) d.setMonth(d.getMonth() + 1);
  return d;
}

// Atendimentos pendentes que compõem o ciclo atual do mensalista.
async function atendimentosDoCiclo(clienteId: string) {
  return prisma.appointment.findMany({
    where: {
      clienteId,
      statusPagamento: "pendente",
      status: { in: ["agendado", "concluido"] },
    },
    include: { servicos: { include: { servico: { select: { nome: true } } } } },
    orderBy: [{ data: "asc" }, { horarioInicio: "asc" }],
  });
}

export type EmitirOpts = {
  manual?: boolean; // emitida pelo barbeiro (permite valor 0 / cobrança avulsa)
  forcar?: boolean; // ignora cobrança aberta existente e cria nova
};

// Emite uma cobrança para o mensalista. Idempotente: se já houver cobrança aberta
// (pendente/vencido) retorna ela, salvo `forcar`. Dispara push de "cobrança emitida".
export async function emitirCobranca(
  mensalistaId: string,
  opts: EmitirOpts = {}
): Promise<SubscriptionCharge | null> {
  const sub = await prisma.subscription.findUnique({
    where: { id: mensalistaId },
  });
  if (!sub) throw new Error("Mensalista não encontrado");

  const aberta = await prisma.subscriptionCharge.findFirst({
    where: { mensalistaId, status: { in: ["pendente", "vencido"] } },
    orderBy: { criadoEm: "desc" },
  });
  if (aberta && !opts.forcar) return aberta;

  const ags = await atendimentosDoCiclo(sub.clienteId);
  const valor = ags.reduce((s, a) => s + Number(a.valorTotal), 0);

  // Sem nada a cobrar e fora de emissão manual → não gera ruído.
  if (valor <= 0 && !opts.manual) return null;

  const itens: ItemCobranca[] = ags.map((a) => ({
    id: a.id,
    data: a.data.toISOString().slice(0, 10),
    servicos: a.servicos.map((s) => s.servico.nome),
    valor: Number(a.valorTotal),
  }));
  const vencimento = sub.proximaCobranca ?? proximaCobranca(sub.diaCobranca);
  const descricao =
    itens.length > 0
      ? `${itens.length} ${itens.length === 1 ? "corte" : "cortes"} no ciclo`
      : "Mensalidade";

  const charge = await prisma.subscriptionCharge.create({
    data: {
      mensalistaId,
      clienteId: sub.clienteId,
      valor,
      vencimento,
      descricao,
      itens: itens as unknown as Prisma.InputJsonValue,
      emitidaManual: Boolean(opts.manual),
      status: "pendente",
      ultimoLembrete: new Date(),
    },
  });

  // Cria a preferência de pagamento no MP (no-op silencioso sem credencial).
  await garantirPreferencia(charge.id);

  void notify({
    type: "cobranca_emitida",
    chargeId: charge.id,
    valor,
  });

  return prisma.subscriptionCharge.findUnique({ where: { id: charge.id } });
}

// Garante (cria se faltar) a preferência de pagamento MP da cobrança.
// Retorna o init_point (URL do checkout) ou null quando MP não está configurado.
export async function garantirPreferencia(chargeId: string): Promise<string | null> {
  const charge = await prisma.subscriptionCharge.findUnique({
    where: { id: chargeId },
    include: { cliente: { select: { nome: true } } },
  });
  if (!charge) return null;
  if (charge.mpInitPoint) return charge.mpInitPoint;
  if (Number(charge.valor) <= 0) return null;

  const TITULO_POR_TIPO: Record<string, string> = {
    mensalista: "Mensalidade — Biel Barber",
    pacote: "Pacote — Biel Barber",
    pedido: "Pedido Loja — Biel Barber",
    agendamento: "Agendamento — Biel Barber",
  };

  const BACK_URL_POR_TIPO: Record<string, string> = {
    mensalista: "/mensalista",
    pacote: "/pacotes",
    pedido: "/loja",
    agendamento: "/meus-agendamentos",
  };

  const pref = await criarPreferencia({
    chargeId: charge.id,
    titulo: TITULO_POR_TIPO[charge.tipo] ?? "Pagamento — Biel Barber",
    valor: Number(charge.valor),
    descricao: charge.descricao ?? undefined,
    pagadorNome: charge.cliente.nome,
    backUrlPath: BACK_URL_POR_TIPO[charge.tipo] ?? "/mensalista",
  });
  if (!pref) return null;

  await prisma.subscriptionCharge.update({
    where: { id: chargeId },
    data: { mpPreferenceId: pref.preferenceId, mpInitPoint: pref.initPoint },
  });
  return pref.initPoint;
}

// Cria uma cobrança avulsa para ativar um pacote (pago online, antes de ativar).
// Idempotente: reaproveita cobrança pendente do mesmo pacote/cliente para não
// gerar QRs duplicados se o cliente reabrir o checkout.
export async function criarCobrancaPacote(
  clienteId: string,
  pacoteId: string
): Promise<SubscriptionCharge> {
  const pacote = await prisma.package.findFirstOrThrow({
    where: { id: pacoteId, ativo: true },
  });

  const aberta = await prisma.subscriptionCharge.findFirst({
    where: { clienteId, pacoteId, tipo: "pacote", status: "pendente" },
    orderBy: { criadoEm: "desc" },
  });
  if (aberta) return aberta;

  const charge = await prisma.subscriptionCharge.create({
    data: {
      tipo: "pacote",
      clienteId,
      pacoteId,
      valor: pacote.preco,
      descricao: pacote.nome,
      vencimento: new Date(),
      status: "pendente",
    },
  });

  // Gera preferência MP automaticamente (silent fail se não configurado)
  await garantirPreferencia(charge.id).catch(() => {});

  return prisma.subscriptionCharge.findUnique({ where: { id: charge.id } }) as Promise<SubscriptionCharge>;
}

// Cria uma cobrança para um pedido da loja, vinculada ao pedido.
export async function criarCobrancaPedido(
  clienteId: string,
  pedidoId: string,
  valor: number,
  descricao: string
): Promise<SubscriptionCharge> {
  const charge = await prisma.subscriptionCharge.create({
    data: {
      tipo: "pedido",
      clienteId,
      pedidoId,
      valor,
      descricao: descricao.slice(0, 200),
      vencimento: new Date(),
      status: "pendente",
    },
  });

  // Gera preferência MP automaticamente
  await garantirPreferencia(charge.id).catch(() => {});

  return prisma.subscriptionCharge.findUnique({ where: { id: charge.id } }) as Promise<SubscriptionCharge>;
}

// Cria uma cobrança para um agendamento avulso (pago online), vinculada a ele.
export async function criarCobrancaAgendamento(
  clienteId: string,
  agendamentoId: string,
  valor: number,
  descricao: string
): Promise<SubscriptionCharge> {
  const charge = await prisma.subscriptionCharge.create({
    data: {
      tipo: "agendamento",
      clienteId,
      agendamentoId,
      valor,
      descricao: descricao.slice(0, 200),
      vencimento: new Date(),
      status: "pendente",
    },
  });

  await garantirPreferencia(charge.id).catch(() => {});

  return prisma.subscriptionCharge.findUnique({ where: { id: charge.id } }) as Promise<SubscriptionCharge>;
}


export type ConfirmarOpts = {
  metodo?: ChargeMethod;
  mpPaymentId?: string;
  comprovanteUrl?: string;
  manual?: boolean; // confirmação manual do barbeiro (recebeu por fora)
};

// Confirma o pagamento de uma cobrança. Idempotente (já paga → no-op).
// Mensalista: quita os atendimentos do snapshot e reinicia o ciclo. Pacote:
// ativa o pacote do cliente (só após o pagamento confirmar). Mantém o
// financeiro consistente (mesmo efeito da antiga ação "marcar_pago").
export async function confirmarPagamento(
  chargeId: string,
  opts: ConfirmarOpts = {}
): Promise<SubscriptionCharge> {
  const charge = await prisma.subscriptionCharge.findUnique({
    where: { id: chargeId },
  });
  if (!charge) throw new Error("Cobrança não encontrada");
  if (charge.status === "pago") return charge;

  if (charge.tipo === "pacote") return confirmarPacote(charge, opts);
  if (charge.tipo === "pedido") return confirmarPedidoCharge(charge, opts);
  if (charge.tipo === "agendamento") return confirmarAgendamentoCharge(charge, opts);

  // mensalista (default)
  const sub = await prisma.subscription.findUnique({
    where: { id: charge.mensalistaId ?? "" },
  });
  if (!sub) throw new Error("Mensalista não encontrado");

  const itens = (charge.itens as unknown as ItemCobranca[] | null) ?? [];
  const idsAg = itens.map((i) => i.id);
  const metodo: ChargeMethod = opts.metodo ?? (opts.manual ? "dinheiro" : "outro");

  const atualizado = await prisma.$transaction(async (tx) => {
    if (idsAg.length > 0) {
      await tx.appointment.updateMany({
        where: { id: { in: idsAg }, statusPagamento: "pendente" },
        data: { statusPagamento: "pago" },
      });
    }
    await tx.subscription.update({
      where: { id: sub.id },
      data: {
        totalCicloAtual: 0,
        dataUltimoPagamento: new Date(),
        valorUltimoPagamento: charge.valor,
        proximaCobranca: proximaCobranca(sub.diaCobranca),
      },
    });
    return tx.subscriptionCharge.update({
      where: { id: chargeId },
      data: {
        status: "pago",
        pagoEm: new Date(),
        metodo,
        mpPaymentId: opts.mpPaymentId ?? charge.mpPaymentId,
        comprovanteUrl: opts.comprovanteUrl ?? charge.comprovanteUrl,
      },
    });
  });

  void notify({
    type: "cobranca_confirmada",
    chargeId: charge.id,
    valor: Number(charge.valor),
  });

  return atualizado;
}

// Confirma uma cobrança de pacote: ativa o pacote do cliente (idempotente — não
// reativa se já houver ClientPackage vinculado) e marca a cobrança como paga.
async function confirmarPacote(
  charge: SubscriptionCharge,
  opts: ConfirmarOpts
): Promise<SubscriptionCharge> {
  if (!charge.pacoteId) throw new Error("Cobrança de pacote sem pacote");
  const metodo: ChargeMethod = opts.metodo ?? (opts.manual ? "dinheiro" : "outro");

  const cp = charge.clientePacoteId
    ? null
    : await ativarPacote(charge.clienteId, charge.pacoteId);

  return prisma.subscriptionCharge.update({
    where: { id: charge.id },
    data: {
      status: "pago",
      pagoEm: new Date(),
      metodo,
      mpPaymentId: opts.mpPaymentId ?? charge.mpPaymentId,
      comprovanteUrl: opts.comprovanteUrl ?? charge.comprovanteUrl,
      clientePacoteId: cp?.id ?? charge.clientePacoteId,
    },
  });
}

// Confirma uma cobrança de pedido da loja: marca o Order como pago.
async function confirmarPedidoCharge(
  charge: SubscriptionCharge,
  opts: ConfirmarOpts
): Promise<SubscriptionCharge> {
  const metodo: ChargeMethod = opts.metodo ?? (opts.manual ? "dinheiro" : "outro");
  return prisma.$transaction(async (tx) => {
    // Baixa o pedido vinculado à cobrança (estoque já foi descontado na criação).
    if (charge.pedidoId) {
      await tx.order.updateMany({
        where: { id: charge.pedidoId, statusPagamento: "pendente" },
        data: {
          statusPagamento: "pago",
          formaPagamento: metodo === "pix" ? "pix" : metodo.startsWith("cartao") ? "cartao" : "local",
        },
      });
    }
    return tx.subscriptionCharge.update({
      where: { id: charge.id },
      data: {
        status: "pago",
        pagoEm: new Date(),
        metodo,
        mpPaymentId: opts.mpPaymentId ?? charge.mpPaymentId,
        comprovanteUrl: opts.comprovanteUrl ?? charge.comprovanteUrl,
      },
    });
  });
}

// Confirma uma cobrança de agendamento avulso: baixa o agendamento vinculado.
async function confirmarAgendamentoCharge(
  charge: SubscriptionCharge,
  opts: ConfirmarOpts
): Promise<SubscriptionCharge> {
  const metodo: ChargeMethod = opts.metodo ?? (opts.manual ? "dinheiro" : "outro");
  return prisma.$transaction(async (tx) => {
    if (charge.agendamentoId) {
      await tx.appointment.updateMany({
        where: { id: charge.agendamentoId, statusPagamento: "pendente" },
        data: { statusPagamento: "pago" },
      });
    }
    return tx.subscriptionCharge.update({
      where: { id: charge.id },
      data: {
        status: "pago",
        pagoEm: new Date(),
        metodo,
        mpPaymentId: opts.mpPaymentId ?? charge.mpPaymentId,
        comprovanteUrl: opts.comprovanteUrl ?? charge.comprovanteUrl,
      },
    });
  });
}

// Cancela uma cobrança aberta (não paga).
export async function cancelarCobranca(chargeId: string): Promise<SubscriptionCharge> {
  const charge = await prisma.subscriptionCharge.findUnique({ where: { id: chargeId } });
  if (!charge) throw new Error("Cobrança não encontrada");
  if (charge.status === "pago") throw new Error("Cobrança já paga não pode ser cancelada");
  return prisma.subscriptionCharge.update({
    where: { id: chargeId },
    data: { status: "cancelado" },
  });
}

// Reenvia o aviso de cobrança ao cliente (push). Atualiza ultimoLembrete.
export async function reenviarCobranca(chargeId: string): Promise<void> {
  const charge = await prisma.subscriptionCharge.findUnique({ where: { id: chargeId } });
  if (!charge || charge.status === "pago" || charge.status === "cancelado") return;
  await prisma.subscriptionCharge.update({
    where: { id: chargeId },
    data: { ultimoLembrete: new Date() },
  });
  void notify({
    type: "cobranca_lembrete",
    chargeId: charge.id,
    valor: Number(charge.valor),
    vencido: charge.status === "vencido",
  });
}

// Rotina do cron: marca cobranças vencidas e dispara lembretes escalonados.
// - pendente cujo vencimento já passou → vencido (+ lembrete)
// - vencido sem lembrete há >= 3 dias → novo lembrete
export async function processarVencimentos(): Promise<{
  vencidas: number;
  lembretes: number;
}> {
  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  // 1) pendentes vencidas → vencido (só mensalidade: pedido/pacote/agendamento
  // são cobranças avulsas pagas na hora, não entram no fluxo de dunning).
  const aVencer = await prisma.subscriptionCharge.findMany({
    where: { tipo: "mensalista", status: "pendente", vencimento: { lt: inicioHoje } },
  });
  for (const c of aVencer) {
    await prisma.subscriptionCharge.update({
      where: { id: c.id },
      data: { status: "vencido", ultimoLembrete: new Date() },
    });
    void notify({
      type: "cobranca_lembrete",
      chargeId: c.id,
      valor: Number(c.valor),
      vencido: true,
    });
  }

  // 2) vencidas antigas → lembrete a cada ~3 dias
  const limite = new Date(hoje.getTime() - 3 * 24 * 60 * 60 * 1000);
  const reincidentes = await prisma.subscriptionCharge.findMany({
    where: {
      tipo: "mensalista",
      status: "vencido",
      id: { notIn: aVencer.map((c) => c.id) },
      OR: [{ ultimoLembrete: null }, { ultimoLembrete: { lt: limite } }],
    },
  });
  for (const c of reincidentes) {
    await prisma.subscriptionCharge.update({
      where: { id: c.id },
      data: { ultimoLembrete: new Date() },
    });
    void notify({
      type: "cobranca_lembrete",
      chargeId: c.id,
      valor: Number(c.valor),
      vencido: true,
    });
  }

  return { vencidas: aVencer.length, lembretes: aVencer.length + reincidentes.length };
}

// Emite automaticamente as cobranças de todos os mensalistas cujo dia de
// fechamento chegou e que ainda não têm cobrança aberta no ciclo.
export async function emitirCobrancasDevidas(): Promise<{ emitidas: number }> {
  const hoje = new Date();
  const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);

  const subs = await prisma.subscription.findMany({
    where: {
      status: "ativo",
      proximaCobranca: { lte: fimHoje },
    },
    select: { id: true },
  });

  let emitidas = 0;
  for (const s of subs) {
    const charge = await emitirCobranca(s.id, { manual: false }).catch((e) => {
      console.error("[cron] falha ao emitir cobrança", s.id, e);
      return null;
    });
    if (charge) emitidas++;
  }
  return { emitidas };
}
