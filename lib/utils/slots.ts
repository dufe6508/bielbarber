import { prisma } from "@/lib/prisma";

// Hora do almoço — nunca vira slot
const HORA_ALMOCO = 12;

// Faixa de funcionamento por dia da semana (0=dom ... 6=sáb).
// Slots de 1 em 1 hora, do início ao fechamento (inclusive).
// Dom (0) e seg (1) ficam vazios por padrão — o barbeiro pode abrir manualmente.
const FAIXA_POR_DIA: Record<number, { inicio: number; fim: number } | null> = {
  0: null, // domingo
  1: null, // segunda
  2: { inicio: 9, fim: 20 }, // terça
  3: { inicio: 9, fim: 20 }, // quarta
  4: { inicio: 9, fim: 20 }, // quinta
  5: { inicio: 14, fim: 22 }, // sexta
  6: { inicio: 9, fim: 20 }, // sábado
};

// Dia da semana a partir de "YYYY-MM-DD" no fuso local (evita o shift de UTC).
function diaDaSemana(data: string): number {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(ano, mes - 1, dia).getDay();
}

// "HH:00" → próxima hora "HH+1:00"
export function proximaHora(h: string): string {
  const hora = Number(h.split(":")[0]);
  return `${String(hora + 1).padStart(2, "0")}:00`;
}

function gerarTodosSlots(data: string): string[] {
  const faixa = FAIXA_POR_DIA[diaDaSemana(data)];
  if (!faixa) return [];

  const slots: string[] = [];
  for (let h = faixa.inicio; h <= faixa.fim; h++) {
    if (h === HORA_ALMOCO) continue;
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }
  return slots;
}

export async function getSlotsDisponiveis(data: string): Promise<string[]> {
  const agendamentos = await prisma.appointment.findMany({
    where: {
      data: new Date(data),
      status: { notIn: ["cancelado"] },
    },
    select: { horarioInicio: true, slots: true },
  });

  // Agendamento de coloração ocupa 2 horários → bloqueia o seguinte também
  const horariosOcupados = new Set<string>();
  for (const a of agendamentos) {
    horariosOcupados.add(a.horarioInicio);
    if (a.slots >= 2) horariosOcupados.add(proximaHora(a.horarioInicio));
  }
  return gerarTodosSlots(data).filter((slot) => !horariosOcupados.has(slot));
}
