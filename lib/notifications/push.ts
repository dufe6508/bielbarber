import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { EVENTO_PREFERENCIA, type NotificationEvent } from "./events";

// VAPID — gere um par com `npx web-push generate-vapid-keys` e configure no .env.
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:contato@bielbarber.com";

let configurado = false;
function configurar(): boolean {
  if (configurado) return true;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  configurado = true;
  return true;
}

type PushAction = { action: string; title: string };
type Payload = {
  title: string;
  body: string;
  url: string;
  // Agrupa notificações do mesmo assunto (uma substitui a outra em vez de empilhar).
  tag?: string;
  // Botões de ação na notificação (ex.: "Pagar agora").
  actions?: PushAction[];
  // Mantém a notificação visível até o usuário interagir (cobranças importantes).
  requireInteraction?: boolean;
};

// Traduz um evento na notificação visível (título, corpo, deep link de destino).
function montarPayload(event: NotificationEvent): Payload {
  switch (event.type) {
    case "agendamento_confirmado":
      return {
        title: "Agendamento confirmado",
        body: "Seu horário está reservado. Toque para ver os detalhes.",
        url: "/meus-agendamentos",
      };
    case "lembrete_horario":
      return {
        title: "Seu horário está chegando",
        body: `Faltam ${event.minutesBefore} min para o seu corte.`,
        url: "/meus-agendamentos",
      };
    case "promocao":
      return {
        title: "Promoção na Biel Barber",
        body: event.message,
        url: event.deepLink || "/",
      };
    case "assinatura_vencendo":
      return {
        title: "Sua mensalidade está fechando",
        body: `Faltam ${event.daysLeft} dia(s) para o fechamento do ciclo.`,
        url: "/mensalista",
      };
    case "estoque_novo":
      return {
        title: "Novidade na loja",
        body: "Chegou um produto novo. Confira!",
        url: `/loja/${event.slug}`,
      };
    case "waitlist_horario_livre":
      return {
        title: "Liberou um horário!",
        body: "Abriu vaga no dia que você queria. Corre que é por ordem de chegada.",
        url: "/agendar",
      };
    case "cobranca_emitida":
      return {
        title: "💈 Mensalidade disponível",
        body: `Sua mensalidade de ${reais(event.valor)} já pode ser paga. Toque em Pagar agora.`,
        url: "/mensalista",
        tag: "cobranca-mensalidade",
        actions: [{ action: "pagar", title: "Pagar agora" }],
        requireInteraction: true,
      };
    case "cobranca_lembrete":
      return {
        title: event.vencido ? "⚠️ Mensalidade vencida" : "🔔 Lembrete de mensalidade",
        body: event.vencido
          ? `Sua mensalidade de ${reais(event.valor)} está vencida. Pague para voltar a agendar.`
          : `Não esqueça: mensalidade de ${reais(event.valor)} aguardando pagamento.`,
        url: "/mensalista",
        tag: "cobranca-mensalidade",
        actions: [{ action: "pagar", title: "Pagar agora" }],
        requireInteraction: true,
      };
    case "cobranca_confirmada":
      return {
        title: "✅ Pagamento confirmado",
        body: `Recebemos sua mensalidade de ${reais(event.valor)}. Obrigado! Já pode agendar de novo.`,
        url: "/mensalista",
        tag: "cobranca-mensalidade",
      };
  }
}

function eventoParaTipo(
  event: NotificationEvent
): "confirmacao" | "lembrete" | "cobranca" | "geral" {
  switch (event.type) {
    case "agendamento_confirmado": return "confirmacao";
    case "lembrete_horario":
    case "waitlist_horario_livre": return "lembrete";
    case "cobranca_emitida":
    case "cobranca_lembrete":
    case "cobranca_confirmada":
    case "assinatura_vencendo": return "cobranca";
    default: return "geral";
  }
}

// R$ no padrão BR (1.234,50).
function reais(v: number): string {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Envia push direto para uma subscription raw (sem busca no banco).
// Usado para testes onde a subscription é passada diretamente pelo frontend.
export async function sendPushDirect(
  subscription: { endpoint: string; p256dh: string; auth: string },
  event: NotificationEvent
): Promise<{ ok: boolean; error?: string }> {
  if (!configurar()) return { ok: false, error: "VAPID não configurado" };
  const payload = JSON.stringify(montarPayload(event));
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      payload
    );
    return { ok: true };
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    return { ok: false, error: `Falha ao enviar push (${status ?? "desconhecido"})` };
  }
}

// Envia push para todas as assinaturas ativas do cliente, respeitando a
// preferência do tipo de evento. No-op silencioso se o VAPID não estiver configurado.
export async function sendPushToClient(
  clienteId: string,
  event: NotificationEvent
): Promise<void> {
  if (!configurar()) {
    console.log("[push] VAPID ausente — pulando envio", clienteId, event.type);
    return;
  }

  // Respeita a preferência do cliente para esse tipo de evento.
  const pref = await prisma.notificationPreference.findUnique({
    where: { clienteId },
  });
  if (pref) {
    if (!pref.pushAtivo) return;
    const flag = EVENTO_PREFERENCIA[event.type];
    if (pref[flag] === false) return;
  }

  const assinaturas = await prisma.pushSubscription.findMany({
    where: { clienteId, ativo: true },
  });
  if (assinaturas.length === 0) return;

  const p = montarPayload(event);
  const payload = JSON.stringify(p);
  const conteudo = `${p.title} — ${p.body}`;

  let enviouAlgum = false;
  await Promise.all(
    assinaturas.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        enviouAlgum = true;
      } catch (err) {
        // 404/410 = assinatura morta (navegador desinstalado/expirou) → desativa.
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.update({
            where: { id: s.id },
            data: { ativo: false },
          });
        } else {
          console.error("[push] falha ao enviar", s.endpoint, status);
        }
      }
    })
  );

  // Registra no inbox do cliente (aparece no sininho).
  if (enviouAlgum) {
    await prisma.notificationLog.create({
      data: {
        clienteId,
        tipo: eventoParaTipo(event),
        canal: "push",
        status: "enviado",
        conteudo,
      },
    });
  }
}
