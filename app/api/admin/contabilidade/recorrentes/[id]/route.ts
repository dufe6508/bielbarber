import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORIAS, dataUTC } from "@/lib/admin/accounting";
import type { ExpenseCategory } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

// PATCH — atualiza molde recorrente (inclui ativar/desativar).
export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const b = await request.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (b.nome !== undefined) data.nome = String(b.nome).slice(0, 80);
  if (b.categoria !== undefined)
    data.categoria = (CATEGORIAS.includes(b.categoria) ? b.categoria : "outros") as ExpenseCategory;
  if (b.valor !== undefined) data.valor = Number(b.valor);
  if (b.diaVencimento !== undefined) {
    const dia = Number(b.diaVencimento);
    data.diaVencimento = dia >= 1 && dia <= 31 ? dia : null;
  }
  if (b.dataInicio !== undefined) data.dataInicio = dataUTC(b.dataInicio);
  if (b.observacao !== undefined)
    data.observacao = b.observacao ? String(b.observacao).slice(0, 300) : null;
  if (b.variavel !== undefined) data.variavel = Boolean(b.variavel);
  if (b.ativo !== undefined) data.ativo = Boolean(b.ativo);

  const molde = await prisma.recurringExpense.update({ where: { id }, data });
  return NextResponse.json(molde);
}

// DELETE — remove o molde. Overrides já lançados (Expense) ficam com
// recorrenteId nulo (SetNull) e permanecem no histórico.
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.recurringExpense.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
