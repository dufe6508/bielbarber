import { NextResponse } from "next/server";
import type { ChargeMethod } from "@prisma/client";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  confirmarPagamento,
  cancelarCobranca,
  reenviarCobranca,
} from "@/lib/billing/charges";

type Ctx = { params: Promise<{ id: string }> };

// GET — detalhe de uma cobrança (resumo + itens + dados da transação).
export async function GET(_req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const cobranca = await prisma.subscriptionCharge.findUnique({
    where: { id },
    include: { cliente: { select: { nome: true, telefone: true } } },
  });
  if (!cobranca) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  return NextResponse.json(cobranca);
}

// PATCH — ações sobre a cobrança.
//   { acao: "marcar_pago", metodo? }  → confirma pagamento manual
//   { acao: "cancelar" }              → cancela cobrança aberta
//   { acao: "reenviar" }              → reenvia aviso ao cliente
export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const b = await request.json().catch(() => null);

  try {
    if (b?.acao === "marcar_pago") {
      const metodo: ChargeMethod = [
        "pix",
        "cartao_credito",
        "cartao_debito",
        "dinheiro",
        "outro",
      ].includes(b?.metodo)
        ? (b.metodo as ChargeMethod)
        : "dinheiro";
      const charge = await confirmarPagamento(id, { manual: true, metodo });
      return NextResponse.json(charge);
    }
    if (b?.acao === "cancelar") {
      const charge = await cancelarCobranca(id);
      return NextResponse.json(charge);
    }
    if (b?.acao === "reenviar") {
      await reenviarCobranca(id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
