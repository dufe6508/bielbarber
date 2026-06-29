import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

// DELETE — remove o registro da foto. (Arquivo no Storage fica órfão; limpeza
// em lote pode rodar depois se virar problema de espaço.)
// ponytail: não apaga do bucket — volume baixo, custo de storage irrelevante.
export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.clientPhoto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
