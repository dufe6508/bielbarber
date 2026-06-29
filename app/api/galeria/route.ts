import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGaleriaVisivel } from "@/lib/utils/slots";

// GET — categorias ativas para a vitrine pública (destaque primeiro).
// Inclui capa + contagem de imagens. Sem auth.
export async function GET() {
  const visivel = await getGaleriaVisivel();
  if (!visivel) return NextResponse.json([]);

  const categorias = await prisma.galleryCategory.findMany({
    where: { ativo: true },
    orderBy: [{ destaque: "desc" }, { ordem: "asc" }, { nome: "asc" }],
    select: {
      id: true,
      nome: true,
      slug: true,
      descricao: true,
      precoMedio: true,
      imagemCapa: true,
      destaque: true,
      _count: { select: { imagens: true } },
    },
  });
  return NextResponse.json(categorias);
}
