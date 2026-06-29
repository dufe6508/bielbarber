import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORIAS, dataUTC, despesasDoMes, parseMes } from "@/lib/admin/accounting";
import type { ExpenseCategory, ExpenseStatus } from "@prisma/client";

// GET ?mes=YYYY-MM — despesas efetivas do mês (reais + recorrentes virtuais).
export async function GET(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { ano, mesIndex } = parseMes(new URL(request.url).searchParams.get("mes"));
  return NextResponse.json(await despesasDoMes(ano, mesIndex));
}

// POST — cria despesa avulsa (lançamento único do mês).
export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const b = await request.json().catch(() => null);
  if (!b?.nome || typeof b.valor !== "number" || b.valor <= 0) {
    return NextResponse.json({ error: "Nome e valor são obrigatórios" }, { status: 400 });
  }
  const categoria: ExpenseCategory = CATEGORIAS.includes(b.categoria) ? b.categoria : "outros";
  const status: ExpenseStatus = b.status === "pendente" ? "pendente" : "pago";
  const despesa = await prisma.expense.create({
    data: {
      nome: String(b.nome).slice(0, 80),
      categoria,
      valor: b.valor,
      data: dataUTC(b.data),
      status,
      observacao: b.observacao ? String(b.observacao).slice(0, 300) : null,
    },
  });
  return NextResponse.json(despesa, { status: 201 });
}
