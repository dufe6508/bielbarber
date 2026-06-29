import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

// PATCH — reordena e/ou alterna destaque de uma imagem.
export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const b = await request.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (b.ordem !== undefined) data.ordem = Number(b.ordem);
  if (b.destaque !== undefined) data.destaque = Boolean(b.destaque);

  const imagem = await prisma.galleryImage.update({ where: { id }, data });
  revalidateTag("galeria", {});
  return NextResponse.json(imagem);
}

// DELETE — remove uma imagem.
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.galleryImage.delete({ where: { id } }).catch(() => null);
  revalidateTag("galeria", {});
  return NextResponse.json({ ok: true });
}
