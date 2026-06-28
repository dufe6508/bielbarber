import { prisma } from "@/lib/prisma";

// Hora do almoço — excluída dos horários padrão (o barbeiro pode reabrir no painel).
const HORA_ALMOCO = 12;

// Faixa padrão de funcionamento por dia da semana (0=dom ... 6=sáb).
// É só o ponto de partida: o barbeiro edita os horários abertos no painel.
// Dom (0) e seg (1) nascem fechados (folga). Sem linha no banco = usa este padrão.
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
function diaDaSemana(data: string): number {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(ano, mes - 1, dia).getDay();
}

// "HH:00" → próxima hora "HH+1:00"
export function proximaHora(h: string): string {
  const hora = Number(h.split(":")[0]);
  return `${String(hora + 1).padStart(2, "0")}:00`;
}

// Horários abertos de um dia da semana: linha salva pelo barbeiro tem prioridade;
// sem linha, cai no padrão (ter–sáb cheios, dom/seg vazios).
async function horariosBaseDoDia(dow: number): Promise<string[]> {
  const linha = await prisma.weeklySchedule.findUnique({
    where: { diaSemana: dow },
  });
  const horarios = linha ? linha.horarios : horariosPadraoDoDia(dow);
  return [...horarios].sort();
}

// Agenda semanal efetiva (7 dias) para o painel admin.
// `padrao` = true quando ainda não foi editada (usa o default).
export async function getAgendaSemanal(): Promise<
  { diaSemana: number; horarios: string[]; padrao: boolean }[]
> {
  const linhas = await prisma.weeklySchedule.findMany();
  const porDia = new Map(linhas.map((l) => [l.diaSemana, l.horarios]));
  return Array.from({ length: 7 }, (_, dow) => {
    const salvo = porDia.get(dow);
    return {
      diaSemana: dow,
      horarios: [...(salvo ?? horariosPadraoDoDia(dow))].sort(),
      padrao: salvo === undefined,
    };
  });
}

// Salva (upsert) os horários abertos de um dia da semana.
export async function salvarAgendaDia(
  dow: number,
  horarios: string[]
): Promise<void> {
  const limpos = Array.from(new Set(horarios))
    .filter((h) => GRADE_HORARIOS.includes(h))
    .sort();
  await prisma.weeklySchedule.upsert({
    where: { diaSemana: dow },
    update: { horarios: limpos },
    create: { diaSemana: dow, horarios: limpos },
  });
}

// ─── Horizonte de agendamento ──────────────────────────────────────────────
// Quantos dias à frente o cliente pode marcar. Guardado em `configuracoes`.
const CHAVE_HORIZONTE = "horizonte_agendamento_dias";
const HORIZONTE_PADRAO = 60;

export async function getHorizonteDias(): Promise<number> {
  const linha = await prisma.setting.findUnique({
    where: { chave: CHAVE_HORIZONTE },
  });
  const n = linha ? parseInt(linha.valor, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : HORIZONTE_PADRAO;
}

export async function setHorizonteDias(dias: number): Promise<void> {
  const valor = String(Math.max(1, Math.min(365, Math.round(dias))));
  await prisma.setting.upsert({
    where: { chave: CHAVE_HORIZONTE },
    update: { valor },
    create: { chave: CHAVE_HORIZONTE, valor },
  });
}

// "YYYY-MM-DD" → true se está além do horizonte (cliente não pode marcar).
export async function foraDoHorizonte(data: string): Promise<boolean> {
  const dias = await getHorizonteDias();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setDate(hoje.getDate() + dias);
  const [a, m, d] = data.split("-").map(Number);
  const alvo = new Date(a, m - 1, d);
  return alvo < hoje || alvo > limite;
}

// ─── Exceções pontuais (feriados/folgas/aberturas extras) ──────────────────
// Para uma data, a exceção tem prioridade sobre a agenda semanal.
// Todas as horas abertas de uma data (respeita exceção), ocupadas ou não.
// Usado pela agenda do dia no painel.
export async function getHorariosAbertos(data: string): Promise<string[]> {
  return horariosBaseComExcecao(data);
}

// Horas abertas pela ROTINA SEMANAL desta data (ignora exceção). Base do editor
// de folgas/ajustes: mostra o que está aberto por padrão para então bloquear/abrir.
export async function getHorariosBaseDia(data: string): Promise<string[]> {
  return horariosBaseDoDia(diaDaSemana(data));
}

async function horariosBaseComExcecao(data: string): Promise<string[]> {
  const excecao = await prisma.scheduleException.findUnique({
    where: { data: new Date(data) },
  });
  if (excecao) {
    if (excecao.tipo === "fechado") return [];
    return [...excecao.horarios].sort();
  }
  return horariosBaseDoDia(diaDaSemana(data));
}

export async function getSlotsDisponiveis(data: string): Promise<string[]> {
  if (await foraDoHorizonte(data)) return [];

  const base = await horariosBaseComExcecao(data);
  if (base.length === 0) return [];

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
  return base.filter((slot) => !horariosOcupados.has(slot));
}
