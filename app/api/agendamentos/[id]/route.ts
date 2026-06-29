import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToClient } from "@/lib/notifications/push";
import { dataISOLocal } from "@/lib/utils/format";

// Avisa a fila de espera daquela data que abriu um horário.
async function avisarListaEspera(data: Date): Promise<void> {
  const naFila = await prisma.waitlist.findMany({
    where: { data },
    select: { clienteId: true },
  });
  const iso = dataISOLocal(data);
  await Promise.all(
    naFila.map((w) =>
      sendPushToClient(w.clienteId, {
        type: "waitlist_horario_livre",
        date: iso,
        clienteId: w.clienteId,
      })
    )
  );
}

type Body =
  | { acao: "cancelar" }
  | { acao: "remarcar"; data: string; horario: string }
  | { acao: "avaliar"; rating: number; ratingComentario?: string }
  | { acao: "checkin" };

// É o mesmo dia (local) do agendamento?
function ehHoje(data: Date): boolean {
  const hoje = new Date();
  return (
    data.getFullYear() === hoje.getFullYear() &&
    data.getMonth() === hoje.getMonth() &&
    data.getDate() === hoje.getDate()
  );
}

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

  // ─── Avaliar (rating pós-corte) ───
  if (body.acao === "avaliar") {
    if (agendamento.status !== "concluido") {
      return NextResponse.json(
        { error: "Só dá pra avaliar um corte já concluído." },
        { status: 409 }
      );
    }
    if (agendamento.rating != null) {
      return NextResponse.json(
        { error: "Este corte já foi avaliado." },
        { status: 409 }
      );
    }
    const rating = Math.round(Number(body.rating));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Avaliação inválida." },
        { status: 400 }
      );
    }
    const comentario = body.ratingComentario?.trim().slice(0, 500) || null;
    await prisma.appointment.update({
      where: { id },
      data: { rating, ratingComentario: comentario, ratingEm: new Date() },
    });
    return NextResponse.json({ ok: true, rating });
  }

  // ─── Check-in ("Cheguei!") ───
  if (body.acao === "checkin") {
    if (agendamento.status !== "agendado") {
      return NextResponse.json(
        { error: "Check-in indisponível para este agendamento." },
        { status: 409 }
      );
    }
    if (!ehHoje(agendamento.data)) {
      return NextResponse.json(
        { error: "O check-in só fica disponível no dia do corte." },
        { status: 409 }
      );
    }
    if (agendamento.checkinEm) {
      return NextResponse.json({ ok: true, checkinEm: agendamento.checkinEm });
    }
    const atualizado = await prisma.appointment.update({
      where: { id },
      data: { checkinEm: new Date() },
    });
    return NextResponse.json({ ok: true, checkinEm: atualizado.checkinEm });
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
    // Abriu horário → notifica quem está na fila daquele dia.
    await avisarListaEspera(agendamento.data);
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
