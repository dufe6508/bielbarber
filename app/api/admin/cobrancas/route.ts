import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma, ChargeStatus } from "@prisma/client";

// GET — lista de cobranças para o painel. Filtro opcional ?status=pendente|vencido|pago...
// Retorna nome/telefone do cliente embutidos para a UI.
export async function GET(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where: Prisma.SubscriptionChargeWhereInput = {};
  if (status && ["pendente", "pago", "vencido", "cancelado", "expirado"].includes(status)) {
    where.status = status as ChargeStatus;
  }

  const cobrancas = await prisma.subscriptionCharge.findMany({
    where,
    orderBy: { criadoEm: "desc" },
    take: 200,
    include: { cliente: { select: { nome: true, telefone: true } } },
  });

  return NextResponse.json(
    cobrancas.map((c) => ({
      id: c.id,
      mensalistaId: c.mensalistaId,
      nome: c.cliente.nome,
      telefone: c.cliente.telefone,
      valor: c.valor,
      status: c.status,
      vencimento: c.vencimento,
      descricao: c.descricao,
      metodo: c.metodo,
      emitidaManual: c.emitidaManual,
      mpPaymentId: c.mpPaymentId,
      comprovanteUrl: c.comprovanteUrl,
      pagoEm: c.pagoEm,
      criadoEm: c.criadoEm,
    }))
  );
}
