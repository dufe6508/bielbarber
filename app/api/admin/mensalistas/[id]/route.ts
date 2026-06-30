import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ChargeMethod } from "@prisma/client";
import {
  emitirCobranca,
  confirmarPagamento,
} from "@/lib/billing/charges";

type Ctx = { params: Promise<{ id: string }> };

function proximaCobranca(dia: number, ref = new Date()): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), dia);
  if (d <= ref) d.setMonth(d.getMonth() + 1);
  return d;
}

// PATCH — ações no mensalista.
//   { acao:"marcar_pago", metodo? }  → emite cobrança (se não existir) e confirma
//   { acao:"status", status:"ativo"|"inativo" }
//   { diaCobranca:10|30 }
export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const b = await request.json().catch(() => null);

  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  if (b?.acao === "marcar_pago") {
    const metodo: ChargeMethod = ["pix", "cartao_credito", "cartao_debito", "dinheiro", "outro"].includes(b?.metodo)
      ? (b.metodo as ChargeMethod)
      : "dinheiro";

    // Garante que existe uma cobrança (emite se necessário, reutiliza a aberta)
    let charge = await prisma.subscriptionCharge.findFirst({
      where: { mensalistaId: id, status: { in: ["pendente", "vencido"] } },
      orderBy: { criadoEm: "desc" },
    });
    if (!charge) {
      charge = await emitirCobranca(id, { manual: true });
    }
    if (!charge) {
      // Ciclo em zero — apenas reinicia o ciclo sem cobrança
      await prisma.subscription.update({
        where: { id },
        data: {
          totalCicloAtual: 0,
          dataUltimoPagamento: new Date(),
          proximaCobranca: proximaCobranca(sub.diaCobranca),
        },
      });
      return NextResponse.json({ ok: true, total: 0 });
    }

    const confirmada = await confirmarPagamento(charge.id, { manual: true, metodo });
    return NextResponse.json({ ok: true, total: Number(confirmada.valor) });
  }

  const data: Record<string, unknown> = {};
  if (b?.status === "ativo" || b?.status === "inativo") data.status = b.status;
  if (b?.diaCobranca === 10 || b?.diaCobranca === 30) {
    data.diaCobranca = b.diaCobranca;
    data.proximaCobranca = proximaCobranca(b.diaCobranca);
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }
  const atualizado = await prisma.subscription.update({ where: { id }, data });
  return NextResponse.json(atualizado);
}

// DELETE — desativa o mensalista (mantém histórico).
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.subscription
    .update({ where: { id }, data: { status: "inativo" } })
    .catch(() => null);
  return NextResponse.json({ ok: true });
}
