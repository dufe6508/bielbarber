import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { consultarPagamento, mapStatusMP, mapMetodoMP } from "@/lib/mercadopago";
import { confirmarPagamento } from "@/lib/billing/charges";
import type { ChargeMethod } from "@prisma/client";

export const dynamic = "force-dynamic";

// Valida a assinatura HMAC do webhook (header x-signature). Retorna true se o
// segredo não estiver configurado — mantém o fluxo de teste/manual funcionando
// antes de ligar a credencial definitiva do barbeiro (mesmo desacoplamento do
// mpConfigurado()). Manifest conforme docs do MP: id;request-id;ts.
function assinaturaValida(request: Request, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // ainda não ligado — não bloqueia

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");
  if (!xSignature) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => p.split("=").map((s) => s.trim()) as [string, string])
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  // MP exige data.id em minúsculas quando alfanumérico.
  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const esperado = createHmac("sha256", secret).update(manifest).digest("hex");

  const a = Buffer.from(esperado, "hex");
  const b = Buffer.from(v1, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// POST — webhook do Mercado Pago. Recebe a notificação de pagamento, consulta o
// status real na API (fonte da verdade) e atualiza a cobrança correspondente.
// Sempre responde 200 rápido para o MP não reenfileirar indefinidamente.
export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    /* MP às vezes manda querystring — tratamos abaixo */
  }

  const { searchParams } = new URL(request.url);
  const tipo =
    (body as { type?: string })?.type ?? searchParams.get("type") ?? searchParams.get("topic");
  const paymentId =
    (body as { data?: { id?: string } })?.data?.id ??
    searchParams.get("data.id") ??
    searchParams.get("id");

  // Rejeita notificações forjadas antes de qualquer consulta/escrita.
  if (paymentId && !assinaturaValida(request, String(paymentId))) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  // Só tratamos eventos de pagamento.
  if (tipo !== "payment" || !paymentId) {
    return NextResponse.json({ received: true });
  }

  try {
    const pagamento = await consultarPagamento(String(paymentId));
    if (!pagamento || !pagamento.externalReference) {
      return NextResponse.json({ received: true });
    }

    const chargeId = pagamento.externalReference;
    const novoStatus = mapStatusMP(pagamento.status);

    const charge = await prisma.subscriptionCharge.findUnique({
      where: { id: chargeId },
      select: { id: true, status: true },
    });
    if (!charge) return NextResponse.json({ received: true });

    if (novoStatus === "pago" && charge.status !== "pago") {
      await confirmarPagamento(chargeId, {
        mpPaymentId: String(paymentId),
        metodo: mapMetodoMP(pagamento.metodo) as ChargeMethod,
        comprovanteUrl: pagamento.comprovanteUrl ?? undefined,
      });
    } else if (novoStatus === "cancelado" && charge.status !== "pago") {
      await prisma.subscriptionCharge.update({
        where: { id: chargeId },
        data: { status: "cancelado", mpPaymentId: String(paymentId) },
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[mp/webhook] erro", err);
    // 200 mesmo em erro: evita reentrega agressiva; logs cobrem o diagnóstico.
    return NextResponse.json({ received: true });
  }
}
