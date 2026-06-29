import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clienteIdPorTelefone } from "@/lib/notifications/inbox";

// Confere que a notificação pertence ao cliente do telefone (prova de posse).
async function donoOk(id: string, telefone: string): Promise<string | null> {
  const clienteId = await clienteIdPorTelefone(telefone);
  if (!clienteId) return null;
  const n = await prisma.notification.findUnique({ where: { id }, select: { clienteId: true } });
  return n && n.clienteId === clienteId ? clienteId : null;
}

// PATCH — marcar lida / fixar. Body: { telefone, lida?, fixada? }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    telefone?: string;
    lida?: boolean;
    fixada?: boolean;
  };
  if (!(await donoOk(id, body.telefone || ""))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }
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

// DELETE — remove a notificação. Body: { telefone }
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { telefone?: string };
  if (!(await donoOk(id, body.telefone || ""))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }
  await prisma.notification.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
