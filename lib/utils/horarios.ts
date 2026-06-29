// Helpers puros de horário (sem prisma) — seguros para importar em client components.

// Hora do almoço — excluída dos horários padrão (o barbeiro pode reabrir no painel).
const HORA_ALMOCO = 12;

// Faixa padrão de funcionamento por dia da semana (0=dom ... 6=sáb).
const FAIXA_PADRAO: Record<number, { inicio: number; fim: number } | null> = {
  0: null, // domingo
  1: null, // segunda
  2: { inicio: 9, fim: 20 }, // terça
  3: { inicio: 9, fim: 20 }, // quarta
  4: { inicio: 9, fim: 20 }, // quinta
  5: { inicio: 14, fim: 22 }, // sexta
  6: { inicio: 9, fim: 20 }, // sábado
};

// Grade completa de horas que o painel mostra para abrir/fechar (08:00–22:00).
export const GRADE_HORARIOS: string[] = Array.from({ length: 15 }, (_, i) =>
  `${String(8 + i).padStart(2, "0")}:00`
);

// Horários abertos por padrão num dia da semana (antes de qualquer edição do barbeiro).
export function horariosPadraoDoDia(dow: number): string[] {
  const faixa = FAIXA_PADRAO[dow];
  if (!faixa) return [];
  const horas: string[] = [];
  for (let h = faixa.inicio; h <= faixa.fim; h++) {
    if (h === HORA_ALMOCO) continue;
    horas.push(`${String(h).padStart(2, "0")}:00`);
  }
  return horas;
}

// Dia da semana a partir de "YYYY-MM-DD" no fuso local (evita o shift de UTC).
export function diaDaSemana(data: string): number {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(ano, mes - 1, dia).getDay();
}

// "HH:00" → próxima hora "HH+1:00"
export function proximaHora(h: string): string {
  const hora = Number(h.split(":")[0]);
  return `${String(hora + 1).padStart(2, "0")}:00`;
}
