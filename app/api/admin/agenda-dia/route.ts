import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHorariosAbertos } from "@/lib/utils/slots";

// GET — agenda de um dia: horas abertas + agendamentos (não cancelados).
// ?data=YYYY-MM-DD
export async function GET(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const data = new URL(request.url).searchParams.get("data");
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ error: "data inválida" }, { status: 400 });
  }

  const [horarios, agendamentos] = await Promise.all([
    getHorariosAbertos(data),
    prisma.appointment.findMany({
      where: { data: new Date(data), status: { not: "cancelado" } },
      include: {
        cliente: { select: { nome: true, telefone: true } },
        servicos: { include: { servico: { select: { nome: true } } } },
      },
      orderBy: { horarioInicio: "asc" },
    }),
  ]);

  return NextResponse.json({
    horarios,
    agendamentos: agendamentos.map((a) => ({
      id: a.id,
      horarioInicio: a.horarioInicio,
      slots: a.slots,
      status: a.status,
      statusPagamento: a.statusPagamento,
      valorTotal: a.valorTotal,
      cliente: a.cliente,
      servicos: a.servicos.map((s) => s.servico.nome),
    })),
  });
}
