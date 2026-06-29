import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/notificacoes/marcar-todas — marca todas do admin como lidas.
export async function POST() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  await prisma.notification.updateMany({
    where: { audiencia: "admin", lida: false },
    data: { lida: true, lidaEm: new Date() },
  });
  return NextResponse.json({ ok: true });
}
