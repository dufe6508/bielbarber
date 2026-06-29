import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFidelidadeMeta } from "@/lib/utils/slots";

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
  // Remarcar (admin override, sem checagem de slot — espelha o controle manual
  // que o barbeiro já faz hoje). data: "YYYY-MM-DD", horarioInicio: "HH:00".
  if (typeof b?.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.data)) {
    data.data = new Date(`${b.data}T00:00:00Z`);
  }
  if (typeof b?.horarioInicio === "string" && /^\d{2}:\d{2}$/.test(b.horarioInicio)) {
    data.horarioInicio = b.horarioInicio;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  // Fidelidade: só carimba na TRANSIÇÃO para "concluido" (evita carimbar de novo
  // se o admin reabrir/salvar o mesmo agendamento já concluído).
  const carimbar =
    data.status === "concluido"
      ? (await prisma.appointment.findUnique({
          where: { id },
          select: { status: true },
        }))?.status !== "concluido"
      : false;

  const ag = await prisma.appointment.update({
    where: { id },
    data,
    include: {
      cliente: { select: { id: true, nome: true, telefone: true, carimbos: true } },
      servicos: { include: { servico: { select: { nome: true } } } },
    },
  });

  if (carimbar) {
    const meta = await getFidelidadeMeta();
    const novo = ag.cliente.carimbos + 1;
    // Atingiu a meta → zera (recomeça o cartão).
    await prisma.client.update({
      where: { id: ag.cliente.id },
      data: { carimbos: novo >= meta ? 0 : novo },
    });
  }

  return NextResponse.json(ag);
}
