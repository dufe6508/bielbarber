import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Body =
  | { acao: "cancelar" }
  | { acao: "remarcar"; data: string; horario: string };

// Monta o Date de início a partir da data (só-data) + "HH:MM"
function inicioDe(dataDate: Date, horario: string): Date {
  const [h, m] = horario.split(":").map(Number);
  const d = new Date(dataDate);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

const UMA_HORA = 60 * 60 * 1000;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as Body;

  const agendamento = await prisma.appointment.findUnique({ where: { id } });
  if (!agendamento) {
    return NextResponse.json(
      { error: "Agendamento não encontrado." },
      { status: 404 }
    );
  }
  if (agendamento.status !== "agendado") {
    return NextResponse.json(
      { error: "Este agendamento não pode mais ser alterado." },
      { status: 409 }
    );
  }

  const inicio = inicioDe(agendamento.data, agendamento.horarioInicio);
  if (inicio.getTime() - Date.now() < UMA_HORA) {
    return NextResponse.json(
      { error: "Alterações são permitidas só até 1 hora antes do horário." },
      { status: 409 }
    );
  }

  // ─── Cancelar ───
  if (body.acao === "cancelar") {
    const atualizado = await prisma.appointment.update({
      where: { id },
      data: { status: "cancelado" },
    });
    return NextResponse.json({ ok: true, status: atualizado.status });
  }

  // ─── Remarcar ───
  if (body.acao === "remarcar") {
    const { data, horario } = body;
    if (!data || !horario) {
      return NextResponse.json(
        { error: "Informe a nova data e horário." },
        { status: 400 }
      );
    }

    // Slot livre? (ignora cancelados e o próprio agendamento)
    const ocupado = await prisma.appointment.findFirst({
      where: {
        data: new Date(data),
        horarioInicio: horario,
        status: { notIn: ["cancelado"] },
        id: { not: id },
      },
    });
    if (ocupado) {
      return NextResponse.json(
        { error: "Esse horário já está ocupado. Escolha outro." },
        { status: 409 }
      );
    }

    const atualizado = await prisma.appointment.update({
      where: { id },
      data: { data: new Date(data), horarioInicio: horario },
    });
    return NextResponse.json({
      ok: true,
      data: atualizado.data,
      horario: atualizado.horarioInicio,
    });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
