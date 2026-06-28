import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

// PATCH — atualiza produto.
export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const b = await request.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (b.nome !== undefined) data.nome = String(b.nome).slice(0, 80);
  if (b.descricao !== undefined)
    data.descricao = b.descricao ? String(b.descricao).slice(0, 300) : null;
  if (b.preco !== undefined) data.preco = Number(b.preco);
  if (b.precoAntigo !== undefined)
    data.precoAntigo =
      typeof b.precoAntigo === "number" && b.precoAntigo > 0 ? b.precoAntigo : null;
  if (b.quantidadeEstoque !== undefined)
    data.quantidadeEstoque = Math.max(0, Number(b.quantidadeEstoque));
  if (b.urlImagem !== undefined)
    data.urlImagem = b.urlImagem ? String(b.urlImagem).slice(0, 500) : null;
  if (b.categoria !== undefined)
    data.categoria = b.categoria ? String(b.categoria).slice(0, 40) : null;
  if (b.badge !== undefined) data.badge = b.badge ? String(b.badge).slice(0, 24) : null;
  if (b.destaque !== undefined) data.destaque = Boolean(b.destaque);
  if (b.ativo !== undefined) data.ativo = Boolean(b.ativo);
  if (b.ordem !== undefined) data.ordem = Number(b.ordem);

  const produto = await prisma.product.update({ where: { id }, data });
  return NextResponse.json(produto);
}

// DELETE — remove; se já vendido, desativa.
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const emUso = await prisma.orderItem.findFirst({
    where: { produtoId: id },
    select: { id: true },
  });
  if (emUso) {
    await prisma.product.update({ where: { id }, data: { ativo: false } });
    return NextResponse.json({ ok: true, desativado: true });
  }
  await prisma.product.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
