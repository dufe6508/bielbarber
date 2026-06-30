import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clienteIdPorTelefone } from "@/lib/notifications/inbox";

// POST /api/notificacoes/limpar — limpa a caixa do cliente de uma vez (sem login,
// prova de posse pelo telefone). Preserva as fixadas. Body: { telefone }.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { telefone?: string };
  const clienteId = await clienteIdPorTelefone(body.telefone || "");
  if (!clienteId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }
  const { count } = await prisma.notification.deleteMany({
    where: { clienteId, audiencia: "cliente", fixada: false },
  });
  return NextResponse.json({ ok: true, removidas: count });
}
