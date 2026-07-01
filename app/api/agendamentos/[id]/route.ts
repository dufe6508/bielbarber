import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications/notify";
import { dataISOLocal } from "@/lib/utils/format";
import { proximaHora } from "@/lib/utils/slots";

// Avisa a fila de espera daquela data que abriu um horário.
async function avisarListaEspera(data: Date): Promise<void> {
  const naFila = await prisma.waitlist.findMany({
    where: { data },
    select: { clienteId: true },
  });
  const iso = dataISOLocal(data);
  await Promise.all(
    naFila.map((w) =>
      notify({
        type: "waitlist_horario_livre",
        date: iso,
        clienteId: w.clienteId,
      })
    )
  );
}

const BodySchema = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("cancelar"), telefone: z.string() }),
  z.object({ acao: z.literal("remarcar"), data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), horario: z.string().regex(/^\d{2}:\d{2}$/), telefone: z.string() }),
  z.object({ acao: z.literal("avaliar"), rating: z.number().int().min(1).max(5), ratingComentario: z.string().max(500).optional(), telefone: z.string() }),
  z.object({ acao: z.literal("checkin"), telefone: z.string() }),
]);
type Body = z.infer<typeof BodySchema>;

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
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const body = parsed.data;

  const agendamento = await prisma.appointment.findUnique({
    where: { id },
    include: { cliente: { select: { telefone: true } } },
  });
  if (!agendamento) {
    return NextResponse.json(
      { error: "Agendamento não encontrado." },
      { status: 404 }
    );
  }

  const telefone = body.telefone?.replace(/\D/g, "");
  if (!telefone || agendamento.cliente.telefone.replace(/\D/g, "") !== telefone) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
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
    void notify({ type: "avaliacao_recebida", appointmentId: id });
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
    void notify({ type: "checkin_realizado", appointmentId: id });
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
    // Cliente cancelou → confirma p/ ele + avisa o admin.
    void notify({ type: "agendamento_cancelado", appointmentId: id, porCliente: true });
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

    // Mesma quantidade de slots que o agendamento já ocupava (ex: coloração = 2)
    const slotsNecessarios = agendamento.slots;
    const horariosNecessarios =
      slotsNecessarios >= 2 ? [horario, proximaHora(horario)] : [horario];

    // Slots livres? (ignora cancelados e o próprio agendamento)
    const ocupado = await prisma.appointment.findFirst({
      where: {
        data: new Date(data),
        horarioInicio: { in: horariosNecessarios },
        status: { notIn: ["cancelado"] },
        id: { not: id },
      },
    });
    if (ocupado) {
      return NextResponse.json(
        {
          error:
            slotsNecessarios >= 2
              ? "Esse serviço precisa de 2 horários seguidos livres. Escolha outro."
              : "Esse horário já está ocupado. Escolha outro.",
        },
        { status: 409 }
      );
    }

    const atualizado = await prisma.appointment.update({
      where: { id },
      data: { data: new Date(data), horarioInicio: horario },
    });
    void notify({ type: "agendamento_remarcado", appointmentId: id });
    return NextResponse.json({
      ok: true,
      data: atualizado.data,
      horario: atualizado.horarioInicio,
    });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
