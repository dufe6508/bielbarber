import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — lista pedidos da loja para o painel admin.
// ?status=pendente|pago&limit=100
export async function GET(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);

  const pedidos = await prisma.order.findMany({
    where: status && ["pendente", "pago", "falhou"].includes(status)
      ? { statusPagamento: status as "pendente" | "pago" | "falhou" }
      : undefined,
    orderBy: { criadoEm: "desc" },
    take: limit,
    include: {
      cliente: { select: { nome: true, telefone: true } },
      itens: {
        include: { produto: { select: { nome: true } } },
      },
    },
  });

  return NextResponse.json(
    pedidos.map((p) => ({
      id: p.id,
      cliente: p.cliente.nome,
      telefone: p.cliente.telefone,
      total: p.total,
      statusPagamento: p.statusPagamento,
      formaPagamento: p.formaPagamento,
      statusRetirada: p.statusRetirada,
      criadoEm: p.criadoEm,
      itens: p.itens.map((i) => ({
        nome: i.produto.nome,
        quantidade: i.quantidade,
        preco: i.precoNaHora,
      })),
    }))
  );
}
