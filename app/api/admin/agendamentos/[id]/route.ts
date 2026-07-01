import { NextResponse, after } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFidelidadeMeta } from "@/lib/utils/slots";
import { notify } from "@/lib/notifications/notify";
import { consumirPorAgendamento } from "@/lib/packages";

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

  // Estado anterior — base para detectar transições (carimbo, cancelamento,
  // remarcação) e decidir quais notificações disparar ao cliente.
  const antes = await prisma.appointment.findUnique({
    where: { id },
    select: { status: true, data: true, horarioInicio: true },
  });

  // Fidelidade: só carimba na TRANSIÇÃO para "concluido" (evita carimbar de novo
  // se o admin reabrir/salvar o mesmo agendamento já concluído).
  const carimbar = data.status === "concluido" && antes?.status !== "concluido";

  // Admin cancelou (transição p/ cancelado) → avisar o cliente.
  const cancelou = data.status === "cancelado" && antes?.status !== "cancelado";
  // Admin remarcou (mudou data ou horário) sem cancelar → avisar o cliente.
  const remarcou =
    !cancelou &&
    ((data.data instanceof Date &&
      data.data.getTime() !== antes?.data.getTime()) ||
      (typeof data.horarioInicio === "string" &&
        data.horarioInicio !== antes?.horarioInicio));

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
    const completou = novo >= meta;
    // Atingiu a meta → zera (recomeça o cartão).
    await prisma.client.update({
      where: { id: ag.cliente.id },
      data: { carimbos: completou ? 0 : novo },
    });
    after(() =>
      notify({
        type: "fidelidade_carimbo",
        clienteId: ag.cliente.id,
        carimbos: completou ? meta : novo,
        faltam: completou ? 0 : meta - novo,
      }).catch(() => {})
    );
  }

  // Consumo automático de pacote: ao concluir, desconta de um pacote ativo do
  // cliente que cubra algum serviço do agendamento (sem efeito se não houver).
  if (carimbar) {
    after(() => consumirPorAgendamento(id).catch(() => {}));
  }

  // porCliente:false → notifica só o cliente (admin não alerta a si mesmo).
  if (cancelou) {
    after(() =>
      notify({ type: "agendamento_cancelado", appointmentId: id, porCliente: false }).catch(() => {})
    );
  } else if (remarcou) {
    after(() => notify({ type: "agendamento_remarcado", appointmentId: id }).catch(() => {}));
  }

  return NextResponse.json(ag);
}
