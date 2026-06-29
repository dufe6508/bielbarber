import type { Prisma, ChargeMethod, SubscriptionCharge } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPushToClient } from "@/lib/notifications/push";
import { criarPreferencia } from "@/lib/mercadopago";

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

  void sendPushToClient(sub.clienteId, {
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

  const pref = await criarPreferencia({
    chargeId: charge.id,
    titulo: "Mensalidade — Biel Barber",
    valor: Number(charge.valor),
    descricao: charge.descricao ?? undefined,
    pagadorNome: charge.cliente.nome,
  });
  if (!pref) return null;

  await prisma.subscriptionCharge.update({
    where: { id: chargeId },
    data: { mpPreferenceId: pref.preferenceId, mpInitPoint: pref.initPoint },
  });
  return pref.initPoint;
}

export type ConfirmarOpts = {
  metodo?: ChargeMethod;
  mpPaymentId?: string;
  comprovanteUrl?: string;
  manual?: boolean; // confirmação manual do barbeiro (recebeu por fora)
};

// Confirma o pagamento de uma cobrança. Idempotente (já paga → no-op).
// Quita os atendimentos do snapshot, reinicia o ciclo do mensalista e mantém o
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

  const sub = await prisma.subscription.findUnique({
    where: { id: charge.mensalistaId },
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

  void sendPushToClient(charge.clienteId, {
    type: "cobranca_confirmada",
    chargeId: charge.id,
    valor: Number(charge.valor),
  });

  return atualizado;
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
  void sendPushToClient(charge.clienteId, {
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

  // 1) pendentes vencidas → vencido
  const aVencer = await prisma.subscriptionCharge.findMany({
    where: { status: "pendente", vencimento: { lt: inicioHoje } },
  });
  for (const c of aVencer) {
    await prisma.subscriptionCharge.update({
      where: { id: c.id },
      data: { status: "vencido", ultimoLembrete: new Date() },
    });
    void sendPushToClient(c.clienteId, {
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
    void sendPushToClient(c.clienteId, {
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
