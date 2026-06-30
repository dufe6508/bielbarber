import { NextResponse } from "next/server";
import { renovarSessaoAdmin } from "@/lib/auth";
import { listarDoAdmin } from "@/lib/notifications/inbox";

// GET /api/admin/notificacoes — inbox do admin (audiência admin).
// Valida e desliza a sessão de quebra: o painel faz polling aqui a cada 60s,
// então a sessão se mantém fresca enquanto o admin estiver com o app aberto.
export async function GET() {
  if (!(await renovarSessaoAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return NextResponse.json(await listarDoAdmin());
}
