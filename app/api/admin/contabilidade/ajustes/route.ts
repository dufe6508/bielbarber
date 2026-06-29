import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dataUTC, parseMes } from "@/lib/admin/accounting";
import type { AdjustmentType } from "@prisma/client";

// GET ?mes=YYYY-MM — ajustes manuais do mês.
export async function GET(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { ano, mesIndex } = parseMes(new URL(request.url).searchParams.get("mes"));
  const desde = new Date(Date.UTC(ano, mesIndex, 1));
  const ate = new Date(Date.UTC(ano, mesIndex + 1, 1));
  const ajustes = await prisma.accountingAdjustment.findMany({
    where: { data: { gte: desde, lt: ate } },
    orderBy: { data: "desc" },
  });
  return NextResponse.json(ajustes);
}

// POST — cria ajuste manual de faturamento (entrada/saída).
export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const b = await request.json().catch(() => null);
  if (typeof b?.valor !== "number" || b.valor <= 0 || !b?.motivo) {
    return NextResponse.json({ error: "Valor e motivo são obrigatórios" }, { status: 400 });
  }
  const tipo: AdjustmentType = b.tipo === "saida" ? "saida" : "entrada";
  const ajuste = await prisma.accountingAdjustment.create({
    data: {
      valor: b.valor,
      tipo,
      motivo: String(b.motivo).slice(0, 200),
      data: dataUTC(b.data),
    },
  });
  return NextResponse.json(ajuste, { status: 201 });
}
