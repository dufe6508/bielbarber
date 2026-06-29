import { prisma } from "@/lib/prisma";
import { notify } from "./notify";

// ─── Motor de lembretes de horário ──────────────────────────────────────────
// Dispara lembretes 24h / 2h / 30min antes do corte. Idempotente: cada bucket
// (em minutos) é marcado em Appointment.lembretes ao processar, então um bucket
// nunca dispara duas vezes. Rodar no cron a cada ~15 min.

const BUCKETS = [1440, 120, 30] as const; // 24h, 2h, 30min
// Janela de tolerância: só dispara se o gatilho foi cruzado há pouco (≈ intervalo
// do cron). Buckets cruzados há mais tempo são marcados como "perdidos" (não
// reenvia um lembrete de 24h quando faltam só 2h, p.ex.).
const GRACE = 25;

// Monta o Date de início a partir da data (só-data, meia-noite UTC) + "HH:MM"
// no fuso local do servidor (espelha lib/api/agendamentos/[id]).
function inicioDe(data: Date, horario: string): Date {
  const [h, m] = horario.split(":").map(Number);
  return new Date(
    data.getUTCFullYear(),
    data.getUTCMonth(),
    data.getUTCDate(),
    h ?? 0,
    m ?? 0,
    0,
    0
  );
}

export async function processarLembretes(): Promise<{ enviados: number }> {
  const agora = new Date();
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const fimAmanha = new Date(inicioHoje.getTime() + 2 * 24 * 60 * 60 * 1000);

  // Agendados de hoje/amanhã (janela suficiente p/ o bucket de 24h).
  const ags = await prisma.appointment.findMany({
    where: {
      status: "agendado",
      data: { gte: inicioHoje, lt: fimAmanha },
    },
    select: { id: true, data: true, horarioInicio: true, lembretes: true },
  });

  let enviados = 0;

  for (const ag of ags) {
    const restanteMin = (inicioDe(ag.data, ag.horarioInicio).getTime() - agora.getTime()) / 60000;
    if (restanteMin <= 0) continue; // já começou

    const novosBuckets: number[] = [];
    for (const B of BUCKETS) {
      if (ag.lembretes.includes(B)) continue;
      if (restanteMin > B) continue; // ainda não chegou a hora deste bucket
      // restanteMin <= B → cruzou o gatilho. Dentro da janela = envia; senão perdido.
      const dentroJanela = restanteMin > B - GRACE;
      if (dentroJanela) {
        await notify({ type: "lembrete_horario", appointmentId: ag.id, minutesBefore: B });
        enviados++;
      }
      novosBuckets.push(B); // marca (enviado ou perdido) p/ não reprocessar
    }

    if (novosBuckets.length > 0) {
      await prisma.appointment.update({
        where: { id: ag.id },
        data: { lembretes: { set: [...ag.lembretes, ...novosBuckets] } },
      });
    }
  }

  return { enviados };
}
