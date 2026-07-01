import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarPagamento, mapStatusMP, mapMetodoMP } from "@/lib/mercadopago";
import { confirmarPagamento } from "@/lib/billing/charges";
import type { ChargeMethod } from "@prisma/client";

export const dynamic = "force-dynamic";

// E-mail sintético para o pagador do Pix. O MP exige um e-mail no pagamento,
// mas o fluxo do cliente é sem cadastro (nome + telefone) — então derivamos um
// endereço estável do telefone em vez de pedir e-mail na tela. É usado só para
// o recibo do Pix; o pagamento em si é identificado pelo external_reference.
function emailPix(telefone: string): string {
  const so = telefone.replace(/\D/g, "") || "cliente";
  return `pix.${so}@bielbarber.com.br`;
}

// Extrai uma mensagem legível do erro do SDK do Mercado Pago. O motivo real
// costuma vir em `cause: [{ code, description }]`; caímos para `message` senão.
function detalheErroMP(err: unknown): string {
  const e = err as {
    cause?: { description?: string; code?: string | number }[];
    message?: string;
    status?: number;
  };
  const c = Array.isArray(e?.cause) ? e.cause[0] : undefined;
  if (c?.description) return `${c.description}${c.code ? ` (${c.code})` : ""}`;
  if (typeof e?.message === "string" && e.message) return e.message;
  return "erro desconhecido no gateway";
}

// POST — processa o pagamento de uma cobrança a partir do formData do Brick de
// cartão OU de um pedido direto de Pix ({ payment_method_id: "pix" }). O valor
// cobrado é SEMPRE o da cobrança no banco (nunca o que vem do cliente). Cartão
// aprovado confirma na hora; Pix volta pendente com QR e é confirmado depois
// pelo webhook.
export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  const chargeId = b?.chargeId;
  const formData = b?.formData;
  if (typeof chargeId !== "string" || !formData || typeof formData !== "object") {
    return NextResponse.json({ error: "dados inválidos" }, { status: 400 });
  }

  const charge = await prisma.subscriptionCharge.findUnique({
    where: { id: chargeId },
    select: {
      id: true,
      status: true,
      valor: true,
      descricao: true,
      cliente: { select: { nome: true, telefone: true } },
    },
  });
  if (!charge) {
    return NextResponse.json({ error: "Cobrança não encontrada" }, { status: 404 });
  }
  if (charge.status === "pago") {
    return NextResponse.json({ status: "approved", pago: true });
  }

  // Pix: o payer não vem da tela (sem campo de e-mail) — montamos aqui a partir
  // do cliente da cobrança. Cartão: o payer já vem do Brick (e-mail + CPF).
  const fd = formData as Record<string, unknown>;
  if (fd.payment_method_id === "pix" && !fd.payer) {
    fd.payer = {
      email: emailPix(charge.cliente.telefone),
      first_name: charge.cliente.nome?.split(/\s+/)[0] || "Cliente",
    };
  }

  let pag;
  try {
    pag = await criarPagamento({
      chargeId,
      valor: Number(charge.valor), // autoritativo
      descricao: charge.descricao ?? undefined,
      formData: fd,
    });
  } catch (err) {
    const detalhe = detalheErroMP(err);
    console.error("[mp/processar] erro ao criar pagamento:", detalhe, err);
    return NextResponse.json(
      { error: "Falha ao processar pagamento", detalhe },
      { status: 502 }
    );
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
