import { NextResponse } from "next/server";
import { varredurasDiarias } from "@/lib/notifications/sweeps";

export const dynamic = "force-dynamic";

// Cron diário de gestão (ver vercel.json): resumo do dia, estoque baixo, meta
// batida e baixa ocupação. Protegido por CRON_SECRET.
function autorizado(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    await varredurasDiarias();
    return NextResponse.json({ ok: true, executadoEm: new Date().toISOString() });
  } catch (err) {
    console.error("[cron/diario] erro", err);
    return NextResponse.json({ error: "Falha no processamento" }, { status: 500 });
  }
}
