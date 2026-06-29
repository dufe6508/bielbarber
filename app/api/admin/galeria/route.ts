import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugUnico } from "@/lib/slugify";

// GET — todas as categorias (inclui inativas) + contagem de imagens. Admin.
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const categorias = await prisma.galleryCategory.findMany({
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    include: {
      imagens: { orderBy: [{ ordem: "asc" }] },
      _count: { select: { imagens: true } },
    },
  });
  return NextResponse.json(categorias);
}

// POST — cria categoria (slug gerado a partir do nome).
export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const b = await request.json().catch(() => null);
  if (!b?.nome) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }
  const slug = await slugUnico(b.nome, async (s) =>
    !!(await prisma.galleryCategory.findUnique({ where: { slug: s }, select: { id: true } }))
  );
  const categoria = await prisma.galleryCategory.create({
    data: {
      nome: String(b.nome).slice(0, 80),
      slug,
      descricao: b.descricao ? String(b.descricao).slice(0, 300) : null,
      precoMedio:
        typeof b.precoMedio === "number" && b.precoMedio > 0 ? b.precoMedio : null,
      imagemCapa: b.imagemCapa ? String(b.imagemCapa).slice(0, 500) : null,
      servicoId: b.servicoId ? String(b.servicoId) : null,
      destaque: Boolean(b.destaque),
      ativo: b.ativo ?? true,
      ordem: Number(b.ordem) || 0,
    },
  });
  revalidateTag("galeria", {});
  return NextResponse.json(categoria, { status: 201 });
}
