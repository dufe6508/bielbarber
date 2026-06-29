import type { $Enums } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatarPreco, paraData } from "@/lib/utils/format";
import type { NotificationEvent, PrefFlag } from "./events";

// ─── Catálogo: evento de negócio → notificações concretas ───────────────────
// Fonte ÚNICA do texto/categoria/prioridade. O dispatcher (notify.ts) e o push
// (push.ts) consomem isto — nada de copy duplicada espalhada.

type Categoria = $Enums.NotificationCategory;
type Prioridade = $Enums.NotificationPriority;

export type PushExtras = {
  tag?: string;
  actions?: { action: string; title: string }[];
  requireInteraction?: boolean;
};

// Uma notificação concreta a gravar/entregar. clienteId ausente num spec de
// audiência "cliente" = BROADCAST para todos os clientes ativos (ex.: promoção).
export type NotificationSpec = {
  audiencia: "cliente" | "admin";
  clienteId?: string;
  categoria: Categoria;
  prioridade: Prioridade;
  titulo: string;
  mensagem: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  prefFlag?: PrefFlag; // gate de preferência do cliente (push). Vazio = sempre entrega.
  push?: PushExtras;
};

// "sexta às 14:00" — weekday por extenso + horário "HH:MM".
function quando(data: Date | string, horario: string): string {
  const dia = paraData(data).toLocaleDateString("pt-BR", { weekday: "long" });
  return `${dia} às ${horario}`;
}

// Primeiro nome (mensagens de admin ficam mais curtas).
function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}

// Traduz um evento numa lista de notificações concretas (faz os lookups que
// precisar de nome/horário). Retorna [] quando não há nada a notificar.
export async function montarSpecs(event: NotificationEvent): Promise<NotificationSpec[]> {
  switch (event.type) {
    // ─── Agenda ──────────────────────────────────────────────────────────────
    case "agendamento_confirmado": {
      const ag = await prisma.appointment.findUnique({
        where: { id: event.appointmentId },
        include: { cliente: { select: { id: true, nome: true } } },
      });
      if (!ag) return [];
      const q = quando(ag.data, ag.horarioInicio);
      return [
        {
          audiencia: "cliente",
          clienteId: ag.clienteId,
          categoria: "agenda",
          prioridade: "normal",
          titulo: "Horário confirmado",
          mensagem: `Seu horário foi confirmado para ${q}.`,
          actionUrl: "/meus-agendamentos",
          metadata: { appointmentId: ag.id },
          prefFlag: "confirmacao",
        },
        {
          audiencia: "admin",
          categoria: "agenda",
          prioridade: "normal",
          titulo: "Novo agendamento",
          mensagem: `${primeiroNome(ag.cliente.nome)} agendou para ${q}.`,
          actionUrl: "/admin/agendamentos",
          metadata: { appointmentId: ag.id },
        },
      ];
    }

    case "agendamento_remarcado": {
      const ag = await prisma.appointment.findUnique({
        where: { id: event.appointmentId },
        include: { cliente: { select: { id: true, nome: true } } },
      });
      if (!ag) return [];
      const q = quando(ag.data, ag.horarioInicio);
      return [
        {
          audiencia: "cliente",
          clienteId: ag.clienteId,
          categoria: "agenda",
          prioridade: "alta",
          titulo: "Horário remarcado",
          mensagem: `Seu horário foi remarcado para ${q}.`,
          actionUrl: "/meus-agendamentos",
          metadata: { appointmentId: ag.id },
          prefFlag: "confirmacao",
        },
        {
          audiencia: "admin",
          categoria: "agenda",
          prioridade: "normal",
          titulo: "Remarcação",
          mensagem: `${primeiroNome(ag.cliente.nome)} remarcou para ${q}.`,
          actionUrl: "/admin/agendamentos",
          metadata: { appointmentId: ag.id },
        },
      ];
    }

    case "agendamento_cancelado": {
      const ag = await prisma.appointment.findUnique({
        where: { id: event.appointmentId },
        include: { cliente: { select: { id: true, nome: true } } },
      });
      if (!ag) return [];
      const q = quando(ag.data, ag.horarioInicio);
      const specs: NotificationSpec[] = [
        {
          audiencia: "cliente",
          clienteId: ag.clienteId,
          categoria: "agenda",
          prioridade: "alta",
          titulo: "Horário cancelado",
          mensagem: `Seu horário de ${q} foi cancelado.`,
          actionUrl: "/agendar",
          metadata: { appointmentId: ag.id },
          prefFlag: "confirmacao",
        },
      ];
      // Só avisa o admin quando foi o cliente que cancelou (admin não alerta a si).
      if (event.porCliente) {
        specs.push({
          audiencia: "admin",
          categoria: "agenda",
          prioridade: "normal",
          titulo: "Cancelamento",
          mensagem: `${primeiroNome(ag.cliente.nome)} cancelou o horário de ${q}.`,
          actionUrl: "/admin/agendamentos",
          metadata: { appointmentId: ag.id },
        });
      }
      return specs;
    }

    case "lembrete_horario": {
      const ag = await prisma.appointment.findUnique({
        where: { id: event.appointmentId },
        select: { id: true, clienteId: true, horarioInicio: true },
      });
      if (!ag) return [];
      const txt =
        event.minutesBefore >= 60
          ? `Seu horário é hoje às ${ag.horarioInicio}.`
          : `Seu horário começa em ${event.minutesBefore} minutos.`;
      return [
        {
          audiencia: "cliente",
          clienteId: ag.clienteId,
          categoria: "agenda",
          prioridade: "normal",
          titulo: "Lembrete de corte",
          mensagem: txt,
          actionUrl: "/meus-agendamentos",
          metadata: { appointmentId: ag.id, minutesBefore: event.minutesBefore },
          prefFlag: "lembrete",
          push: { tag: `lembrete-${ag.id}` },
        },
      ];
    }

    case "checkin_realizado": {
      const ag = await prisma.appointment.findUnique({
        where: { id: event.appointmentId },
        include: { cliente: { select: { nome: true } } },
      });
      if (!ag) return [];
      return [
        {
          audiencia: "admin",
          categoria: "agenda",
          prioridade: "baixa",
          titulo: "Check-in",
          mensagem: `${primeiroNome(ag.cliente.nome)} fez check-in (${ag.horarioInicio}).`,
          actionUrl: "/admin/agendamentos",
          metadata: { appointmentId: ag.id },
        },
      ];
    }

    case "avaliacao_recebida": {
      const ag = await prisma.appointment.findUnique({
        where: { id: event.appointmentId },
        include: { cliente: { select: { nome: true } } },
      });
      if (!ag || ag.rating == null) return [];
      return [
        {
          audiencia: "admin",
          categoria: "sistema",
          prioridade: "baixa",
          titulo: "Nova avaliação",
          mensagem: `${primeiroNome(ag.cliente.nome)} avaliou o corte com ${ag.rating}★.`,
          actionUrl: "/admin/agendamentos",
          metadata: { appointmentId: ag.id, rating: ag.rating },
        },
      ];
    }

    case "agenda_liberada":
      return [
        {
          audiencia: "cliente", // broadcast (sem clienteId)
          categoria: "agenda",
          prioridade: "normal",
          titulo: "Agenda liberada",
          mensagem: "Novos horários disponíveis. Garanta o seu!",
          actionUrl: "/agendar",
          prefFlag: "confirmacao",
          push: { tag: "agenda-liberada" },
        },
      ];

    // ─── Cobrança / pagamentos ────────────────────────────────────────────────
    case "cobranca_emitida":
      return [
        {
          audiencia: "cliente",
          clienteId: await clienteDaCobranca(event.chargeId),
          categoria: "pagamentos",
          prioridade: "alta",
          titulo: "Mensalidade disponível",
          mensagem: `Sua mensalidade de ${formatarPreco(event.valor)} já pode ser paga.`,
          actionUrl: "/mensalista",
          metadata: { chargeId: event.chargeId },
          prefFlag: "assinaturaVencendo",
          push: {
            tag: "cobranca-mensalidade",
            actions: [{ action: "pagar", title: "Pagar agora" }],
            requireInteraction: true,
          },
        },
      ];

    case "cobranca_lembrete":
      return [
        {
          audiencia: "cliente",
          clienteId: await clienteDaCobranca(event.chargeId),
          categoria: "pagamentos",
          prioridade: event.vencido ? "urgente" : "alta",
          titulo: event.vencido ? "Mensalidade vencida" : "Lembrete de mensalidade",
          mensagem: event.vencido
            ? `Sua mensalidade de ${formatarPreco(event.valor)} está vencida. Pague para voltar a agendar.`
            : `Mensalidade de ${formatarPreco(event.valor)} aguardando pagamento.`,
          actionUrl: "/mensalista",
          metadata: { chargeId: event.chargeId, vencido: event.vencido },
          prefFlag: "assinaturaVencendo",
          push: {
            tag: "cobranca-mensalidade",
            actions: [{ action: "pagar", title: "Pagar agora" }],
            requireInteraction: true,
          },
        },
      ];

    case "cobranca_confirmada": {
      const charge = await prisma.subscriptionCharge.findUnique({
        where: { id: event.chargeId },
        include: { cliente: { select: { id: true, nome: true } } },
      });
      if (!charge) return [];
      return [
        {
          audiencia: "cliente",
          clienteId: charge.clienteId,
          categoria: "pagamentos",
          prioridade: "normal",
          titulo: "Pagamento confirmado",
          mensagem: `Recebemos sua mensalidade de ${formatarPreco(event.valor)}. Já pode agendar de novo!`,
          actionUrl: "/mensalista",
          metadata: { chargeId: charge.id },
          prefFlag: "assinaturaVencendo",
          push: { tag: "cobranca-mensalidade" },
        },
        {
          audiencia: "admin",
          categoria: "mensalistas",
          prioridade: "normal",
          titulo: "Mensalidade paga",
          mensagem: `Pagamento de ${primeiroNome(charge.cliente.nome)} confirmado (${formatarPreco(event.valor)}).`,
          actionUrl: "/admin/mensalistas",
          metadata: { chargeId: charge.id },
        },
      ];
    }

    case "pagamento_recebido": {
      const ref = event.tipo === "pedido" ? "Pedido" : "Atendimento";
      const quem = event.clienteNome ? ` — ${primeiroNome(event.clienteNome)}` : "";
      return [
        {
          audiencia: "admin",
          categoria: "pagamentos",
          prioridade: "normal",
          titulo: "Novo pagamento",
          mensagem: `${ref} pago: ${formatarPreco(event.valor)}${quem}.`,
          actionUrl: "/admin/financeiro",
          metadata: { tipo: event.tipo, valor: event.valor },
        },
      ];
    }

    // ─── Assinaturas / mensalistas ────────────────────────────────────────────
    case "assinatura_vencendo": {
      const sub = await prisma.subscription.findUnique({
        where: { id: event.subscriptionId },
        include: { cliente: { select: { id: true, nome: true } } },
      });
      if (!sub) return [];
      return [
        {
          audiencia: "cliente",
          clienteId: sub.clienteId,
          categoria: "assinaturas",
          prioridade: "normal",
          titulo: "Mensalidade fechando",
          mensagem: `Faltam ${event.daysLeft} dia(s) para o fechamento do seu ciclo.`,
          actionUrl: "/mensalista",
          metadata: { subscriptionId: sub.id, daysLeft: event.daysLeft },
          prefFlag: "assinaturaVencendo",
        },
        {
          audiencia: "admin",
          categoria: "assinaturas",
          prioridade: "baixa",
          titulo: "Assinatura vencendo",
          mensagem: `Ciclo de ${primeiroNome(sub.cliente.nome)} fecha em ${event.daysLeft} dia(s).`,
          actionUrl: "/admin/mensalistas",
          metadata: { subscriptionId: sub.id },
        },
      ];
    }

    // ─── Loja ─────────────────────────────────────────────────────────────────
    case "estoque_novo":
      return [
        {
          audiencia: "cliente", // broadcast
          categoria: "loja",
          prioridade: "baixa",
          titulo: "Novidade na loja",
          mensagem: "Chegou produto novo. Confira!",
          actionUrl: `/loja/${event.slug}`,
          prefFlag: "estoqueNovo",
          push: { tag: "loja-novidade" },
        },
      ];

    case "estoque_baixo": {
      const prod = await prisma.product.findUnique({
        where: { id: event.productId },
        select: { nome: true, quantidadeEstoque: true },
      });
      if (!prod) return [];
      return [
        {
          audiencia: "admin",
          categoria: "loja",
          prioridade: "alta",
          titulo: "Estoque baixo",
          mensagem: `${prod.nome} está com estoque baixo (${prod.quantidadeEstoque} un.).`,
          actionUrl: "/admin/produtos",
          metadata: { productId: event.productId },
        },
      ];
    }

    case "pedido_pronto": {
      const pedido = await prisma.order.findUnique({
        where: { id: event.orderId },
        select: { id: true, clienteId: true },
      });
      if (!pedido) return [];
      return [
        {
          audiencia: "cliente",
          clienteId: pedido.clienteId,
          categoria: "loja",
          prioridade: "normal",
          titulo: "Pedido pronto",
          mensagem: "Seu pedido está pronto para retirada na barbearia.",
          actionUrl: "/loja",
          metadata: { orderId: pedido.id },
          prefFlag: "estoqueNovo",
        },
      ];
    }

    // ─── Fidelidade / promoções ───────────────────────────────────────────────
    case "fidelidade_carimbo":
      return [
        {
          audiencia: "cliente",
          clienteId: event.clienteId,
          categoria: "promocoes",
          prioridade: "baixa",
          titulo: "Programa fidelidade",
          mensagem:
            event.faltam <= 0
              ? "Você completou os carimbos! Fale com a barbearia para resgatar."
              : `Você tem ${event.carimbos} carimbos. Faltam ${event.faltam} para o brinde!`,
          actionUrl: "/meus-agendamentos",
          metadata: { carimbos: event.carimbos },
          prefFlag: "promocao",
        },
      ];

    case "promocao":
      return [
        {
          audiencia: "cliente", // broadcast
          categoria: "promocoes",
          prioridade: "baixa",
          titulo: "Promoção na Biel Barber",
          mensagem: event.message,
          actionUrl: event.deepLink || "/loja",
          prefFlag: "promocao",
          push: { tag: "promocao" },
        },
      ];

    // ─── Sistema ──────────────────────────────────────────────────────────────
    case "bloqueio_acesso": {
      const cli = await prisma.client.findUnique({
        where: { id: event.clienteId },
        select: { nome: true },
      });
      const motivo = event.motivo ? ` Motivo: ${event.motivo}.` : "";
      return [
        {
          audiencia: "cliente",
          clienteId: event.clienteId,
          categoria: "sistema",
          prioridade: "urgente",
          titulo: "Acesso bloqueado",
          mensagem: `Seu acesso a novos agendamentos foi temporariamente bloqueado.${motivo}`,
          actionUrl: "/",
          metadata: { clienteId: event.clienteId },
          prefFlag: "sistemaAtivo",
          push: { requireInteraction: true },
        },
        {
          audiencia: "admin",
          categoria: "sistema",
          prioridade: "normal",
          titulo: "Cliente bloqueado",
          mensagem: `${cli ? primeiroNome(cli.nome) : "Cliente"} foi bloqueado.${motivo}`,
          actionUrl: "/admin/clientes",
          metadata: { clienteId: event.clienteId },
        },
      ];
    }

    case "desbloqueio_acesso":
      return [
        {
          audiencia: "cliente",
          clienteId: event.clienteId,
          categoria: "sistema",
          prioridade: "normal",
          titulo: "Acesso liberado",
          mensagem: "Tudo certo! Você já pode agendar novamente.",
          actionUrl: "/agendar",
          metadata: { clienteId: event.clienteId },
          prefFlag: "sistemaAtivo",
        },
      ];

    case "waitlist_horario_livre":
      return [
        {
          audiencia: "cliente",
          clienteId: event.clienteId,
          categoria: "agenda",
          prioridade: "alta",
          titulo: "Liberou um horário!",
          mensagem: "Abriu vaga no dia que você queria. Corre que é por ordem de chegada.",
          actionUrl: "/agendar",
          metadata: { date: event.date },
          prefFlag: "lembrete",
          push: { tag: "waitlist" },
        },
      ];

    case "mensagem_admin":
      return [
        {
          audiencia: "cliente",
          clienteId: event.clienteId,
          categoria: "sistema",
          prioridade: "normal",
          titulo: event.titulo,
          mensagem: event.mensagem,
          actionUrl: event.deepLink || "/",
          prefFlag: "sistemaAtivo",
        },
      ];

    // ─── Gestão (admin) ───────────────────────────────────────────────────────
    case "resumo_diario":
      return [
        {
          audiencia: "admin",
          categoria: "sistema",
          prioridade: "baixa",
          titulo: "Resumo do dia",
          mensagem: `Hoje: ${event.cortes} corte(s), ${event.pendencias} pendência(s), ${formatarPreco(event.faturamento)} em caixa.`,
          actionUrl: "/admin/financeiro",
          metadata: { cortes: event.cortes, faturamento: event.faturamento },
        },
      ];

    case "meta_batida":
      return [
        {
          audiencia: "admin",
          categoria: "sistema",
          prioridade: "normal",
          titulo: "Meta batida! 🎯",
          mensagem: `Você atingiu a meta de ${formatarPreco(event.meta)} (${formatarPreco(event.valor)}).`,
          actionUrl: "/admin/financeiro",
          metadata: { valor: event.valor, meta: event.meta },
        },
      ];

    case "baixa_ocupacao":
      return [
        {
          audiencia: "admin",
          categoria: "agenda",
          prioridade: "baixa",
          titulo: "Baixa ocupação",
          mensagem: `${event.data} está com baixa ocupação (${event.ocupacao}%). Bom dia para uma promoção.`,
          actionUrl: "/admin/agenda",
          metadata: { data: event.data, ocupacao: event.ocupacao },
        },
      ];
  }
}

// clienteId dono de uma cobrança (lookup curto reutilizado).
async function clienteDaCobranca(chargeId: string): Promise<string | undefined> {
  const c = await prisma.subscriptionCharge.findUnique({
    where: { id: chargeId },
    select: { clienteId: true },
  });
  return c?.clienteId;
}
