import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

function proximaCobranca(dia: number, ref = new Date()): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), dia);
  if (d <= ref) d.setMonth(d.getMonth() + 1);
  return d;
}

// PATCH — ações no mensalista.
//   { acao:"marcar_pago" }  → fecha o ciclo: marca atendimentos pendentes como pagos,
//                              registra o pagamento e reinicia o ciclo.
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
    const pend = await prisma.appointment.findMany({
      where: {
        clienteId: sub.clienteId,
        statusPagamento: "pendente",
        status: { in: ["agendado", "concluido"] },
      },
      select: { id: true, valorTotal: true },
    });
    const total = pend.reduce((acc, a) => acc + Number(a.valorTotal), 0);

    await prisma.$transaction([
      prisma.appointment.updateMany({
        where: { id: { in: pend.map((a) => a.id) } },
        data: { statusPagamento: "pago" },
      }),
      prisma.subscription.update({
        where: { id },
        data: {
          totalCicloAtual: 0,
          dataUltimoPagamento: new Date(),
          valorUltimoPagamento: total,
          proximaCobranca: proximaCobranca(sub.diaCobranca),
        },
      }),
    ]);
    return NextResponse.json({ ok: true, total });
  }

  const data: Record<string, unknown> = {};
  if (b?.status === "ativo" || b?.status === "inativo") data.status = b.status;
  if (b?.diaCobranca === 10 || b?.diaCobranca === 30) {
    data.diaCobranca = b.diaCobranca;
    data.proximaCobranca = proximaCobranca(b.diaCobranca);
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
