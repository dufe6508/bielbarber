import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugUnico } from "@/lib/slugify";

type Ctx = { params: Promise<{ id: string }> };

// PATCH — atualiza campos do serviço.
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
      !!(await prisma.service.findFirst({
        where: { slug: s, NOT: { id } },
        select: { id: true },
      }))
    );
  }
  if (b.descricao !== undefined)
    data.descricao = b.descricao ? String(b.descricao).slice(0, 240) : null;
  if (b.preco !== undefined) data.preco = Number(b.preco);
  if (b.duracaoMinutos !== undefined) data.duracaoMinutos = Number(b.duracaoMinutos);
  if (b.slotsNecessarios !== undefined)
    data.slotsNecessarios = Math.max(1, Number(b.slotsNecessarios));
  if (b.capacidadePorSlot !== undefined)
    data.capacidadePorSlot = Math.max(1, Number(b.capacidadePorSlot));
  if (b.ativo !== undefined) data.ativo = Boolean(b.ativo);
  if (b.ordem !== undefined) data.ordem = Number(b.ordem);

  const servico = await prisma.service.update({ where: { id }, data });
  revalidateTag("servicos", {});
  return NextResponse.json(servico);
}

// DELETE — exclui permanentemente o serviço, removendo registros dependentes antes.
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.$transaction([
    prisma.appointmentService.deleteMany({ where: { servicoId: id } }),
    prisma.packageService.deleteMany({ where: { servicoId: id } }),
    prisma.galleryCategory.updateMany({ where: { servicoId: id }, data: { servicoId: null } }),
    prisma.service.delete({ where: { id } }),
  ]);
  revalidateTag("servicos", {});
  return NextResponse.json({ ok: true });
}
