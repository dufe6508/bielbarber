import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugUnico } from "@/lib/slugify";

type Ctx = { params: Promise<{ id: string }> };

// PATCH — edita categoria. Regenera slug se o nome mudar.
export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const b = await request.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (b.nome !== undefined) {
    data.nome = String(b.nome).slice(0, 80);
    data.slug = await slugUnico(b.nome, async (s) =>
      !!(await prisma.galleryCategory.findFirst({
        where: { slug: s, NOT: { id } },
        select: { id: true },
      }))
    );
  }
  if (b.descricao !== undefined)
    data.descricao = b.descricao ? String(b.descricao).slice(0, 300) : null;
  if (b.precoMedio !== undefined)
    data.precoMedio =
      typeof b.precoMedio === "number" && b.precoMedio > 0 ? b.precoMedio : null;
  if (b.imagemCapa !== undefined)
    data.imagemCapa = b.imagemCapa ? String(b.imagemCapa).slice(0, 500) : null;
  if (b.servicoId !== undefined) data.servicoId = b.servicoId ? String(b.servicoId) : null;
  if (b.destaque !== undefined) data.destaque = Boolean(b.destaque);
  if (b.ativo !== undefined) data.ativo = Boolean(b.ativo);
  if (b.ordem !== undefined) data.ordem = Number(b.ordem);

  const categoria = await prisma.galleryCategory.update({ where: { id }, data });
  revalidateTag("galeria", {});
  return NextResponse.json(categoria);
}

// DELETE — remove categoria (cascade apaga as imagens no banco).
// ponytail: não limpa os arquivos no Storage — bucket público, volume baixo;
// limpar via job se o storage crescer.
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.galleryCategory.delete({ where: { id } }).catch(() => null);
  revalidateTag("galeria", {});
  return NextResponse.json({ ok: true });
}
