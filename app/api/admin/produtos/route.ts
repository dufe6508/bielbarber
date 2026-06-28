import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — todos os produtos (inclui inativos).
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const produtos = await prisma.product.findMany({
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  });
  return NextResponse.json(produtos);
}

// POST — cria produto.
export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const b = await request.json().catch(() => null);
  if (!b?.nome || typeof b.preco !== "number") {
    return NextResponse.json({ error: "Nome e preço são obrigatórios" }, { status: 400 });
  }
  const produto = await prisma.product.create({
    data: {
      nome: String(b.nome).slice(0, 80),
      descricao: b.descricao ? String(b.descricao).slice(0, 300) : null,
      preco: b.preco,
      precoAntigo:
        typeof b.precoAntigo === "number" && b.precoAntigo > 0 ? b.precoAntigo : null,
      quantidadeEstoque: Math.max(0, Number(b.quantidadeEstoque) || 0),
      urlImagem: b.urlImagem ? String(b.urlImagem).slice(0, 500) : null,
      categoria: b.categoria ? String(b.categoria).slice(0, 40) : null,
      badge: b.badge ? String(b.badge).slice(0, 24) : null,
      destaque: Boolean(b.destaque),
      ativo: b.ativo ?? true,
      ordem: Number(b.ordem) || 0,
    },
  });
  return NextResponse.json(produto, { status: 201 });
}
