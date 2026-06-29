import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORIAS, dataUTC } from "@/lib/admin/accounting";
import type { ExpenseCategory } from "@prisma/client";

// GET — moldes recorrentes (ativos e inativos).
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const moldes = await prisma.recurringExpense.findMany({ orderBy: { criadoEm: "desc" } });
  return NextResponse.json(moldes);
}

// POST — cria molde recorrente (aluguel, luz fixa, etc.).
export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const b = await request.json().catch(() => null);
  if (!b?.nome || typeof b.valor !== "number" || b.valor <= 0) {
    return NextResponse.json({ error: "Nome e valor são obrigatórios" }, { status: 400 });
  }
  const categoria: ExpenseCategory = CATEGORIAS.includes(b.categoria) ? b.categoria : "outros";
  const dia = Number(b.diaVencimento);
  const molde = await prisma.recurringExpense.create({
    data: {
      nome: String(b.nome).slice(0, 80),
      categoria,
      valor: b.valor,
      diaVencimento: dia >= 1 && dia <= 31 ? dia : null,
      dataInicio: dataUTC(b.dataInicio),
      variavel: Boolean(b.variavel),
      observacao: b.observacao ? String(b.observacao).slice(0, 300) : null,
    },
  });
  return NextResponse.json(molde, { status: 201 });
}
