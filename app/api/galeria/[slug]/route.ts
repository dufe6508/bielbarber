import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ slug: string }> };

// GET — categoria pública pelo slug + imagens ordenadas. 404 se inativa/inexistente.
// Resolve o slug do serviço vinculado para o CTA "Agendar esse estilo".
export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const categoria = await prisma.galleryCategory.findFirst({
    where: { slug, ativo: true },
    include: {
      imagens: { orderBy: [{ destaque: "desc" }, { ordem: "asc" }] },
      servico: { select: { id: true, slug: true, nome: true, preco: true } },
    },
  });
  if (!categoria) {
    return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
  }
  return NextResponse.json(categoria);
}
