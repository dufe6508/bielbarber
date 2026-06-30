import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/notificacoes/limpar — limpa a caixa do admin de uma vez.
// Preserva as fixadas (o "fixar" existe justamente para proteger itens).
export async function POST() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { count } = await prisma.notification.deleteMany({
    where: { audiencia: "admin", fixada: false },
  });
  return NextResponse.json({ ok: true, removidas: count });
}
