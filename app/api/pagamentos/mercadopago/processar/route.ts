import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarPagamento, mapStatusMP, mapMetodoMP } from "@/lib/mercadopago";
import { confirmarPagamento } from "@/lib/billing/charges";
import type { ChargeMethod } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST — processa o pagamento de uma cobrança a partir do formData do Payment
// Brick. Body: { chargeId, formData }. O valor cobrado é SEMPRE o da cobrança no
// banco (nunca o que vem do cliente). Cartão aprovado confirma na hora; Pix volta
// pendente com QR e é confirmado depois pelo webhook.
export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  const chargeId = b?.chargeId;
  const formData = b?.formData;
  if (typeof chargeId !== "string" || !formData || typeof formData !== "object") {
    return NextResponse.json({ error: "dados inválidos" }, { status: 400 });
  }

  const charge = await prisma.subscriptionCharge.findUnique({
    where: { id: chargeId },
    select: { id: true, status: true, valor: true, descricao: true },
  });
  if (!charge) {
    return NextResponse.json({ error: "Cobrança não encontrada" }, { status: 404 });
  }
  if (charge.status === "pago") {
    return NextResponse.json({ status: "approved", pago: true });
  }

  let pag;
  try {
    pag = await criarPagamento({
      chargeId,
      valor: Number(charge.valor), // autoritativo
      descricao: charge.descricao ?? undefined,
      formData: formData as Record<string, unknown>,
    });
  } catch (err) {
    console.error("[mp/processar] erro ao criar pagamento", err);
    return NextResponse.json({ error: "Falha ao processar pagamento" }, { status: 502 });
  }
  if (!pag) {
    return NextResponse.json({ error: "Pagamento indisponível" }, { status: 503 });
  }

  const status = mapStatusMP(pag.status);

  if (status === "pago") {
    await confirmarPagamento(chargeId, {
      mpPaymentId: pag.id,
      metodo: mapMetodoMP(pag.metodo) as ChargeMethod,
    });
  } else if (status === "pendente") {
    // Pix / em análise: guarda o id do MP para reconciliar quando o webhook chegar.
    await prisma.subscriptionCharge
      .update({ where: { id: chargeId }, data: { mpPaymentId: pag.id } })
      .catch(() => {});
  }
  // status === "cancelado" (rejeitado): não altera a cobrança.

  return NextResponse.json({
    status: pag.status,
    statusDetail: pag.statusDetail,
    pix: pag.pix,
  });
}
