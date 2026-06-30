import { NextResponse } from "next/server";
import { renovarSessaoAdmin } from "@/lib/auth";

// GET /api/admin/session — ping de sessão. O painel chama na montagem e ao
// voltar o foco (reabrir o PWA): valida o cookie e desliza a expiração, mantendo
// o admin logado até logout manual. Responde { autenticado: boolean }.
export async function GET() {
  const ok = await renovarSessaoAdmin();
  return NextResponse.json(
    { autenticado: ok },
    { status: ok ? 200 : 401 }
  );
}
