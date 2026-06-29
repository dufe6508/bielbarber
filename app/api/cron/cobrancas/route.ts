import { NextResponse } from "next/server";
import { emitirCobrancasDevidas, processarVencimentos } from "@/lib/billing/charges";

export const dynamic = "force-dynamic";

// Cron diário (ver vercel.json). Protegido por CRON_SECRET:
// a Vercel envia "Authorization: Bearer <CRON_SECRET>" automaticamente.
//   1) emite cobranças dos mensalistas cujo dia de fechamento chegou
//   2) marca cobranças vencidas e dispara lembretes escalonados
function autorizado(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // sem secret configurado (dev) — libera
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const emissao = await emitirCobrancasDevidas();
    const vencimentos = await processarVencimentos();
    return NextResponse.json({
      ok: true,
      emitidas: emissao.emitidas,
      vencidas: vencimentos.vencidas,
      lembretes: vencimentos.lembretes,
      executadoEm: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/cobrancas] erro", err);
    return NextResponse.json({ error: "Falha no processamento" }, { status: 500 });
  }
}
