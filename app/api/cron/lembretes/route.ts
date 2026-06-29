import { NextResponse } from "next/server";
import { processarLembretes } from "@/lib/notifications/reminders";

export const dynamic = "force-dynamic";

// Cron de lembretes (a cada ~15 min — ver vercel.json). Dispara avisos 24h/2h/30min
// antes do corte. Protegido por CRON_SECRET (Vercel envia Bearer automático).
function autorizado(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const r = await processarLembretes();
    return NextResponse.json({ ok: true, ...r, executadoEm: new Date().toISOString() });
  } catch (err) {
    console.error("[cron/lembretes] erro", err);
    return NextResponse.json({ error: "Falha no processamento" }, { status: 500 });
  }
}
