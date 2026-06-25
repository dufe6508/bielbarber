import { prisma } from "@/lib/prisma";

const HORARIO_INICIO = "09:00";
const HORARIO_FIM    = "19:00";
const INTERVALO_MIN  = 30; // intervalo entre slots em minutos

function gerarTodosSlots(): string[] {
  const slots: string[] = [];
  const [hInicio, mInicio] = HORARIO_INICIO.split(":").map(Number);
  const [hFim, mFim] = HORARIO_FIM.split(":").map(Number);

  let totalMinutos = hInicio * 60 + mInicio;
  const fimMinutos = hFim * 60 + mFim;

  while (totalMinutos < fimMinutos) {
    const h = Math.floor(totalMinutos / 60).toString().padStart(2, "0");
    const m = (totalMinutos % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    totalMinutos += INTERVALO_MIN;
  }

  return slots;
}

export async function getSlotsDisponiveis(data: string): Promise<string[]> {
  const agendamentos = await prisma.appointment.findMany({
    where: {
      data: new Date(data),
      status: { notIn: ["cancelado"] },
    },
    select: { horarioInicio: true },
  });

  const horariosOcupados = new Set(agendamentos.map((a) => a.horarioInicio));
  return gerarTodosSlots().filter((slot) => !horariosOcupados.has(slot));
}
