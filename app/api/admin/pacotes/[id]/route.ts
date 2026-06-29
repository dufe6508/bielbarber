import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugUnico } from "@/lib/slugify";

type Ctx = { params: Promise<{ id: string }> };

// PATCH — atualiza pacote. Se vier servicoIds, substitui os serviços inclusos.
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
      !!(await prisma.package.findFirst({
        where: { slug: s, NOT: { id } },
        select: { id: true },
      }))
    );
  }
  if (b.descricao !== undefined)
    data.descricao = b.descricao ? String(b.descricao).slice(0, 300) : null;
  if (b.tipo !== undefined) data.tipo = b.tipo === "quantidade" ? "quantidade" : "combo";
  if (b.preco !== undefined) data.preco = Number(b.preco);
  if (b.validadeDias !== undefined)
    data.validadeDias = b.validadeDias ? Number(b.validadeDias) : null;
  if (b.quantidadeMensal !== undefined)
    data.quantidadeMensal = b.quantidadeMensal ? Number(b.quantidadeMensal) : null;
  if (b.limiteSemanal !== undefined)
    data.limiteSemanal = b.limiteSemanal ? Number(b.limiteSemanal) : null;
  if (b.renovavel !== undefined) data.renovavel = Boolean(b.renovavel);
  if (b.destaque !== undefined) data.destaque = Boolean(b.destaque);
  if (b.ativo !== undefined) data.ativo = Boolean(b.ativo);
  if (b.ordem !== undefined) data.ordem = Number(b.ordem);

  await prisma.package.update({ where: { id }, data });

  if (Array.isArray(b.servicoIds)) {
    await prisma.packageService.deleteMany({ where: { pacoteId: id } });
    await prisma.packageService.createMany({
      data: (b.servicoIds as string[]).map((servicoId) => ({
        pacoteId: id,
        servicoId,
      })),
      skipDuplicates: true,
    });
  }

  const atualizado = await prisma.package.findUnique({
    where: { id },
    include: { servicos: { select: { servicoId: true } } },
  });
  return NextResponse.json(atualizado);
}

// DELETE — remove; se já vendido a algum cliente, desativa.
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const emUso = await prisma.clientPackage.findFirst({
    where: { pacoteId: id },
    select: { id: true },
  });
  if (emUso) {
    await prisma.package.update({ where: { id }, data: { ativo: false } });
    return NextResponse.json({ ok: true, desativado: true });
  }
  await prisma.packageService.deleteMany({ where: { pacoteId: id } });
  await prisma.packageProduct.deleteMany({ where: { pacoteId: id } });
  await prisma.package.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
