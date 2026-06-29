import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { sendPushDirect, sendPushToClient } from "@/lib/notifications/push";
import type { NotificationEvent } from "@/lib/notifications/events";

function buildEvento(tipo: string, clienteId: string): NotificationEvent | null {
  const hoje = new Date().toISOString().slice(0, 10);
  switch (tipo) {
    case "agendamento_confirmado":
      return { type: "agendamento_confirmado", appointmentId: "teste-000" };
    case "lembrete_horario":
      return { type: "lembrete_horario", appointmentId: "teste-000", minutesBefore: 15 };
    case "promocao":
      return { type: "promocao", message: "Promoção de teste — aproveite!" };
    case "assinatura_vencendo":
      return { type: "assinatura_vencendo", subscriptionId: "sub-teste", daysLeft: 3 };
    case "estoque_novo":
      return { type: "estoque_novo", productId: "prod-teste", slug: "gel-fixador" };
    case "waitlist_horario_livre":
      return { type: "waitlist_horario_livre", date: hoje, clienteId };
    case "cobranca_emitida":
      return { type: "cobranca_emitida", chargeId: "cobr-teste", valor: 120 };
    case "cobranca_lembrete":
      return { type: "cobranca_lembrete", chargeId: "cobr-teste", valor: 120, vencido: false };
    case "cobranca_confirmada":
      return { type: "cobranca_confirmada", chargeId: "cobr-teste", valor: 120 };
    default:
      return null;
  }
}

export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const b = await request.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const { destino, tipoEvento, clienteId, subscription } = b;

  if (destino === "admin") {
    if (!subscription?.endpoint || !subscription?.p256dh || !subscription?.auth) {
      return NextResponse.json({ error: "Subscription push inválida" }, { status: 400 });
    }
    const evento = buildEvento(tipoEvento, "admin");
    if (!evento) return NextResponse.json({ error: "Tipo de evento inválido" }, { status: 400 });
    const resultado = await sendPushDirect(subscription, evento);
    return NextResponse.json(resultado, { status: resultado.ok ? 200 : 502 });
  }

  if (destino === "cliente") {
    if (!clienteId) return NextResponse.json({ error: "clienteId obrigatório" }, { status: 400 });
    const evento = buildEvento(tipoEvento, clienteId);
    if (!evento) return NextResponse.json({ error: "Tipo de evento inválido" }, { status: 400 });
    await sendPushToClient(clienteId, evento);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "destino deve ser 'admin' ou 'cliente'" }, { status: 400 });
}
