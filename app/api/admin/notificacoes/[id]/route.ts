import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH — marcar lida / fixar uma notificação do admin. Body: { lida?, fixada? }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    lida?: boolean;
    fixada?: boolean;
  };
  const atualizado = await prisma.notification.update({
    where: { id },
    data: {
      ...(typeof body.lida === "boolean" && {
        lida: body.lida,
        lidaEm: body.lida ? new Date() : null,
      }),
      ...(typeof body.fixada === "boolean" && { fixada: body.fixada }),
    },
  });
  return NextResponse.json({ ok: true, lida: atualizado.lida, fixada: atualizado.fixada });
}

// DELETE — remove uma notificação do admin.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.notification.deleteMany({ where: { id, audiencia: "admin" } });
  return NextResponse.json({ ok: true });
}
