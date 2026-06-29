import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { garantirPreferencia } from "@/lib/billing/charges";
import { mpConfigurado } from "@/lib/mercadopago";

// POST — inicia o checkout de uma cobrança. Body: { chargeId }.
// Retorna o init_point (URL do checkout MP). Sem credencial, devolve
// `configurado:false` e a UI cai no fluxo de pagamento manual/instrução.
export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  const chargeId = b?.chargeId;
  if (typeof chargeId !== "string") {
    return NextResponse.json({ error: "chargeId obrigatório" }, { status: 400 });
  }

  const charge = await prisma.subscriptionCharge.findUnique({
    where: { id: chargeId },
    select: { id: true, status: true },
  });
  if (!charge) {
    return NextResponse.json({ error: "Cobrança não encontrada" }, { status: 404 });
  }
  if (charge.status === "pago") {
    return NextResponse.json({ error: "Cobrança já paga", pago: true }, { status: 409 });
  }

  if (!mpConfigurado()) {
    return NextResponse.json({ configurado: false, initPoint: null });
  }

  const initPoint = await garantirPreferencia(chargeId);
  return NextResponse.json({ configurado: true, initPoint });
}
