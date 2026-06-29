import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { listarDoAdmin } from "@/lib/notifications/inbox";

// GET /api/admin/notificacoes — inbox do admin (audiência admin).
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return NextResponse.json(await listarDoAdmin());
}
