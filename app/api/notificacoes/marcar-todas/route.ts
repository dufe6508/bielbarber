import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clienteIdPorTelefone } from "@/lib/notifications/inbox";

// POST /api/notificacoes/marcar-todas — marca todas as do cliente como lidas.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { telefone?: string };
  const clienteId = await clienteIdPorTelefone(body.telefone || "");
  if (!clienteId) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  await prisma.notification.updateMany({
    where: { clienteId, audiencia: "cliente", lida: false },
    data: { lida: true, lidaEm: new Date() },
  });
  return NextResponse.json({ ok: true });
}
