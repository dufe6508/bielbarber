import { prisma } from "@/lib/prisma";
import {
  GRADE_HORARIOS,
  horariosPadraoDoDia,
  diaDaSemana,
  proximaHora,
} from "@/lib/utils/horarios";

// Re-exporta os helpers puros para manter os imports existentes funcionando.
export { GRADE_HORARIOS, horariosPadraoDoDia, proximaHora };

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

// ─── Visibilidade da galeria ───────────────────────────────────────────────
// Liga/desliga a aba "Galeria" para o cliente. Guardado em `configuracoes`.
const CHAVE_GALERIA = "galeria_visivel";

export async function getGaleriaVisivel(): Promise<boolean> {
  const linha = await prisma.setting.findUnique({
    where: { chave: CHAVE_GALERIA },
  });
  // Padrão: visível (só esconde quando explicitamente "false").
  return linha?.valor !== "false";
}

export async function setGaleriaVisivel(visivel: boolean): Promise<void> {
  const valor = visivel ? "true" : "false";
  await prisma.setting.upsert({
    where: { chave: CHAVE_GALERIA },
    update: { valor },
    create: { chave: CHAVE_GALERIA, valor },
  });
}

// ─── Cartão fidelidade ─────────────────────────────────────────────────────
// Meta de carimbos e recompensa, guardados em `configuracoes` (key/value).
const CHAVE_FID_META = "fidelidade_meta";
const CHAVE_FID_RECOMPENSA = "fidelidade_recompensa";
const FID_META_PADRAO = 10;
const FID_RECOMPENSA_PADRAO = "Corte grátis";

export type Fidelidade = { fidelidadeMeta: number; fidelidadeRecompensa: string };

export async function getFidelidade(): Promise<Fidelidade> {
  const linhas = await prisma.setting.findMany({
    where: { chave: { in: [CHAVE_FID_META, CHAVE_FID_RECOMPENSA] } },
  });
  const meta = linhas.find((l) => l.chave === CHAVE_FID_META)?.valor;
  const recompensa = linhas.find((l) => l.chave === CHAVE_FID_RECOMPENSA)?.valor;
  const n = meta ? parseInt(meta, 10) : NaN;
  return {
    fidelidadeMeta: Number.isFinite(n) && n > 0 ? n : FID_META_PADRAO,
    fidelidadeRecompensa: recompensa || FID_RECOMPENSA_PADRAO,
  };
}

// Lê só a meta — usado pela lógica de incremento de carimbos no admin.
export async function getFidelidadeMeta(): Promise<number> {
  return (await getFidelidade()).fidelidadeMeta;
}

export async function setFidelidade(opts: {
  meta?: number;
  recompensa?: string;
}): Promise<void> {
  const ops = [];
  if (typeof opts.meta === "number") {
    const valor = String(Math.max(1, Math.min(100, Math.round(opts.meta))));
    ops.push(
      prisma.setting.upsert({
        where: { chave: CHAVE_FID_META },
        update: { valor },
        create: { chave: CHAVE_FID_META, valor },
      })
    );
  }
  if (typeof opts.recompensa === "string") {
    const valor = opts.recompensa.slice(0, 80);
    ops.push(
      prisma.setting.upsert({
        where: { chave: CHAVE_FID_RECOMPENSA },
        update: { valor },
        create: { chave: CHAVE_FID_RECOMPENSA, valor },
      })
    );
  }
  await Promise.all(ops);
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
