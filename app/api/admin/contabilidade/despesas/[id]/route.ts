import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORIAS, dataUTC } from "@/lib/admin/accounting";
import type { ExpenseCategory, ExpenseStatus } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

// Monta o objeto de update/create a partir do body (campos opcionais).
function montar(b: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  if (b.nome !== undefined) data.nome = String(b.nome).slice(0, 80);
  if (b.categoria !== undefined)
    data.categoria = (CATEGORIAS.includes(b.categoria as ExpenseCategory)
      ? b.categoria
      : "outros") as ExpenseCategory;
  if (b.valor !== undefined) data.valor = Number(b.valor);
  if (b.data !== undefined) data.data = dataUTC(b.data as string);
  if (b.status !== undefined)
    data.status = (b.status === "pendente" ? "pendente" : "pago") as ExpenseStatus;
  if (b.observacao !== undefined)
    data.observacao = b.observacao ? String(b.observacao).slice(0, 300) : null;
  return data;
}

// PATCH — atualiza despesa. Id "rec:<moldeId>:<YYYY-MM>" cria override do mês.
export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const b = await request.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  // Override de molde recorrente: cria Expense real para aquele mês.
  if (id.startsWith("rec:")) {
    const [, moldeId, mesChave] = id.split(":");
    const molde = await prisma.recurringExpense.findUnique({ where: { id: moldeId } });
    if (!molde) return NextResponse.json({ error: "Molde não encontrado" }, { status: 404 });
    const data = montar(b);
    const dia = Math.min(Math.max(molde.diaVencimento ?? 1, 1), 28);
    const despesa = await prisma.expense.create({
      data: {
        nome: (data.nome as string) ?? molde.nome,
        categoria: (data.categoria as ExpenseCategory) ?? molde.categoria,
        valor: data.valor !== undefined ? (data.valor as number) : molde.valor,
        data: (data.data as Date) ?? dataUTC(`${mesChave}-${String(dia).padStart(2, "0")}`),
        status: (data.status as ExpenseStatus) ?? "pago",
        observacao: data.observacao !== undefined ? (data.observacao as string | null) : molde.observacao,
        recorrenteId: moldeId,
      },
    });
    return NextResponse.json(despesa);
  }

  const despesa = await prisma.expense.update({ where: { id }, data: montar(b) });
  return NextResponse.json(despesa);
}

// DELETE — remove despesa. Se for override de molde, ao excluir a recorrente
// volta a aparecer com o valor padrão no mês.
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  if (id.startsWith("rec:")) {
    return NextResponse.json({ error: "Linha recorrente virtual; edite o molde" }, { status: 400 });
  }
  await prisma.expense.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
