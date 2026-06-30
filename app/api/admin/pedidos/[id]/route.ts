import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { confirmarPagamento } from "@/lib/billing/charges";
import type { ChargeMethod } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

// GET — detalhe de um pedido
export async function GET(_req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const pedido = await prisma.order.findUnique({
    where: { id },
    include: {
      cliente: { select: { nome: true, telefone: true } },
      itens: { include: { produto: { select: { nome: true, urlImagem: true } } } },
    },
  });
  if (!pedido) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(pedido);
}

// PATCH — ações no pedido.
//   { acao:"marcar_pago", metodo? }    → marca pagamento como pago manualmente
//   { acao:"marcar_retirado" }          → atualiza status de retirada
//   { acao:"marcar_pronto" }            → avisa que está pronto para retirar
export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const b = await request.json().catch(() => null);

  const pedido = await prisma.order.findUnique({ where: { id } });
  if (!pedido) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    if (b?.acao === "marcar_pago") {
      const metodo: ChargeMethod = ["pix", "cartao_credito", "cartao_debito", "dinheiro", "outro"].includes(b?.metodo)
        ? (b.metodo as ChargeMethod)
        : "dinheiro";

      // Atualiza o Order
      await prisma.order.update({
        where: { id },
        data: {
          statusPagamento: "pago",
          formaPagamento: metodo === "pix" ? "pix" : metodo.startsWith("cartao") ? "cartao" : "local",
        },
      });

      // Confirma a cobrança MP correspondente (se existir)
      const charge = await prisma.subscriptionCharge.findFirst({
        where: { clienteId: pedido.clienteId, tipo: "pedido", status: { in: ["pendente", "vencido"] } },
        orderBy: { criadoEm: "desc" },
      });
      if (charge) {
        await confirmarPagamento(charge.id, { manual: true, metodo });
      }

      return NextResponse.json({ ok: true });
    }

    if (b?.acao === "marcar_retirado") {
      const atualizado = await prisma.order.update({
        where: { id },
        data: { statusRetirada: "retirado" },
      });
      return NextResponse.json(atualizado);
    }

    if (b?.acao === "marcar_pronto") {
      const atualizado = await prisma.order.update({
        where: { id },
        data: { statusRetirada: "pronto" },
      });
      return NextResponse.json(atualizado);
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
