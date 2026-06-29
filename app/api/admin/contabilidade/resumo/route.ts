import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import {
  parseMes,
  resumoContabil,
  despesasPorCategoria,
  fluxoDeCaixaPorDia,
} from "@/lib/admin/accounting";

// GET ?mes=YYYY-MM — métricas contábeis + séries do mês.
export async function GET(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { ano, mesIndex } = parseMes(new URL(request.url).searchParams.get("mes"));
  const [resumo, categorias, fluxo] = await Promise.all([
    resumoContabil(ano, mesIndex),
    despesasPorCategoria(ano, mesIndex),
    fluxoDeCaixaPorDia(ano, mesIndex),
  ]);
  return NextResponse.json({ resumo, categorias, fluxo });
}
