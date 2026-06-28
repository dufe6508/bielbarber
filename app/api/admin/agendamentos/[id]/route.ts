import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

const STATUS = ["agendado", "concluido", "cancelado", "nao_compareceu"] as const;
const PAGAMENTO = ["pendente", "pago", "falhou"] as const;

// PATCH — admin define status e/ou status de pagamento livremente.
// Body: { status?, statusPagamento? }
export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const b = await request.json().catch(() => null);

  const data: Record<string, unknown> = {};
  if (b?.status && STATUS.includes(b.status)) data.status = b.status;
  if (b?.statusPagamento && PAGAMENTO.includes(b.statusPagamento)) {
    data.statusPagamento = b.statusPagamento;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const ag = await prisma.appointment.update({
    where: { id },
    data,
    include: {
      cliente: { select: { nome: true, telefone: true } },
      servicos: { include: { servico: { select: { nome: true } } } },
    },
  });
  return NextResponse.json(ag);
}
