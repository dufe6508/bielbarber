import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugUnico } from "@/lib/slugify";

// GET — todos os pacotes/planos com serviços inclusos.
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const pacotes = await prisma.package.findMany({
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    include: {
      servicos: { select: { servicoId: true, servico: { select: { nome: true } } } },
    },
  });
  return NextResponse.json(pacotes);
}

// POST — cria pacote/plano.
export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const b = await request.json().catch(() => null);
  if (!b?.nome || typeof b.preco !== "number") {
    return NextResponse.json({ error: "Nome e preço obrigatórios" }, { status: 400 });
  }
  const servicoIds: string[] = Array.isArray(b.servicoIds) ? b.servicoIds : [];

  const slug = await slugUnico(b.nome, async (s) =>
    !!(await prisma.package.findUnique({ where: { slug: s }, select: { id: true } }))
  );
  const pacote = await prisma.package.create({
    data: {
      nome: String(b.nome).slice(0, 80),
      slug,
      descricao: b.descricao ? String(b.descricao).slice(0, 300) : null,
      tipo: b.tipo === "quantidade" ? "quantidade" : "combo",
      preco: b.preco,
      validadeDias: b.validadeDias ? Number(b.validadeDias) : null,
      quantidadeTotal: b.quantidadeTotal ? Number(b.quantidadeTotal) : null,
      quantidadeMensal: b.quantidadeMensal ? Number(b.quantidadeMensal) : null,
      limiteSemanal: b.limiteSemanal ? Number(b.limiteSemanal) : null,
      renovavel: Boolean(b.renovavel),
      destaque: Boolean(b.destaque),
      ativo: b.ativo ?? true,
      ordem: Number(b.ordem) || 0,
      servicos: { create: servicoIds.map((servicoId) => ({ servicoId })) },
    },
  });
  return NextResponse.json(pacote, { status: 201 });
}
