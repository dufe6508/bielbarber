import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ClientPackage, Package } from "@prisma/client";
import { notify } from "@/lib/notifications/notify";

// Abaixo deste saldo (e ainda > 0), avisa o cliente que o pacote está acabando.
const SALDO_BAIXO = 1;

// ─── Lógica de pacotes / assinaturas ────────────────────────────────────────
// Controla saldo (usos restantes), validade, limite semanal e histórico de uso.
// Consumo acontece de duas formas: automático (ao concluir um agendamento com
// serviço coberto) e manual (o barbeiro marca um uso no painel).

// Início da semana corrente (segunda-feira 00:00 local).
function inicioSemana(ref = new Date()): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() + 6) % 7; // segunda = 0
  d.setDate(d.getDate() - diff);
  return d;
}

export type MotivoBloqueio = "expirado" | "encerrado" | "limite_semanal" | "inativo";

export type SaldoPacote = {
  id: string;
  pacoteNome: string;
  usosTotais: number | null;
  usosRestantes: number | null;
  expiraEm: Date | null;
  status: ClientPackage["status"];
  usosNaSemana: number;
  limiteSemanal: number | null;
  diasParaVencer: number | null;
  bloqueado: boolean;
  motivo: MotivoBloqueio | null;
};

// Total de usos que o pacote concede. Quantidade usa quantidadeTotal; combo
// concede 1 uso por serviço incluído (cai pra null = ilimitado se não houver).
function totalDeUsos(pacote: Package, qtdServicos: number): number | null {
  if (pacote.tipo === "quantidade") return pacote.quantidadeTotal ?? null;
  return qtdServicos > 0 ? qtdServicos : null;
}

// Ativa um pacote para um cliente: cria o ClientPackage com saldo e validade.
export async function ativarPacote(clienteId: string, pacoteId: string): Promise<ClientPackage> {
  const pacote = await prisma.package.findUniqueOrThrow({
    where: { id: pacoteId },
    include: { _count: { select: { servicos: true } } },
  });
  const total = totalDeUsos(pacote, pacote._count.servicos);
  const expiraEm = pacote.validadeDias
    ? new Date(Date.now() + pacote.validadeDias * 24 * 60 * 60 * 1000)
    : null;

  return prisma.clientPackage.create({
    data: {
      clienteId,
      pacoteId,
      usosTotais: total,
      usosRestantes: total,
      expiraEm,
      status: "ativo",
    },
  });
}

// Quantos usos foram registrados na semana corrente.
async function usosNaSemana(clientePacoteId: string): Promise<number> {
  return prisma.clientPackageUsage.count({
    where: { clientePacoteId, usadoEm: { gte: inicioSemana() } },
  });
}

// Calcula o saldo + estado de bloqueio de um pacote do cliente.
export async function calcularSaldo(cp: ClientPackage & { pacote: Package }): Promise<SaldoPacote> {
  const agora = new Date();
  const naSemana = await usosNaSemana(cp.id);
  const limiteSemanal = cp.pacote.limiteSemanal ?? null;

  const expirado = cp.expiraEm != null && cp.expiraEm < agora;
  const encerrado = cp.status === "encerrado" || (cp.usosRestantes != null && cp.usosRestantes <= 0);
  const noLimite = limiteSemanal != null && naSemana >= limiteSemanal;

  let motivo: MotivoBloqueio | null = null;
  if (expirado) motivo = "expirado";
  else if (encerrado) motivo = "encerrado";
  else if (noLimite) motivo = "limite_semanal";

  const diasParaVencer =
    cp.expiraEm != null
      ? Math.ceil((cp.expiraEm.getTime() - agora.getTime()) / (24 * 60 * 60 * 1000))
      : null;

  return {
    id: cp.id,
    pacoteNome: cp.pacote.nome,
    usosTotais: cp.usosTotais,
    usosRestantes: cp.usosRestantes,
    expiraEm: cp.expiraEm,
    status: cp.status,
    usosNaSemana: naSemana,
    limiteSemanal,
    diasParaVencer,
    bloqueado: motivo != null,
    motivo,
  };
}

// Pacotes ativos de um cliente, com saldo calculado.
export async function pacotesAtivosDoCliente(clienteId: string): Promise<SaldoPacote[]> {
  const lista = await prisma.clientPackage.findMany({
    where: { clienteId, status: { not: "expirado" } },
    include: { pacote: true },
    orderBy: { compradoEm: "desc" },
  });
  return Promise.all(lista.map(calcularSaldo));
}

export type ResultadoUso =
  | { ok: true; usosRestantes: number | null; encerrado: boolean }
  | { ok: false; motivo: MotivoBloqueio };

// Registra um uso (desconta 1 do saldo). Valida validade, encerramento e
// limite semanal antes. Marca o pacote como "encerrado" ao zerar o saldo.
export async function registrarUso(
  clientePacoteId: string,
  opts: { servicoId?: string; agendamentoId?: string; origem: "automatico" | "manual" }
): Promise<ResultadoUso> {
  const cp = await prisma.clientPackage.findUnique({
    where: { id: clientePacoteId },
    include: { pacote: true },
  });
  if (!cp) return { ok: false, motivo: "encerrado" };

  const saldo = await calcularSaldo(cp);
  if (saldo.bloqueado && saldo.motivo) return { ok: false, motivo: saldo.motivo };

  const restantesAntes = cp.usosRestantes;
  const restantesDepois = restantesAntes != null ? restantesAntes - 1 : null;
  const encerrado = restantesDepois != null && restantesDepois <= 0;

  await prisma.$transaction([
    prisma.clientPackageUsage.create({
      data: {
        clientePacoteId,
        servicoId: opts.servicoId ?? null,
        agendamentoId: opts.agendamentoId ?? null,
        origem: opts.origem,
      },
    }),
    prisma.clientPackage.update({
      where: { id: clientePacoteId },
      data: {
        usosRestantes: restantesDepois ?? undefined,
        status: encerrado ? "encerrado" : cp.status,
      },
    }),
  ]);

  // Avisos automáticos: pacote concluído ou saldo acabando.
  // after() garante que a notificação seja enviada mesmo se a Vercel encerrar
  // a function assim que a resposta HTTP sair — "void" sozinho não garante isso.
  if (encerrado) {
    after(() => notify({ type: "pacote_encerrado", clientePacoteId }).catch(() => {}));
  } else if (restantesDepois != null && restantesDepois <= SALDO_BAIXO && restantesDepois > 0) {
    after(() =>
      notify({
        type: "pacote_saldo_baixo",
        clientePacoteId,
        restantes: restantesDepois,
      }).catch(() => {})
    );
  }

  return { ok: true, usosRestantes: restantesDepois, encerrado };
}

// Desfaz o último uso (estorno manual) — devolve 1 ao saldo e reabre o pacote.
export async function estornarUltimoUso(clientePacoteId: string): Promise<boolean> {
  const ultimo = await prisma.clientPackageUsage.findFirst({
    where: { clientePacoteId },
    orderBy: { usadoEm: "desc" },
  });
  if (!ultimo) return false;
  const cp = await prisma.clientPackage.findUnique({ where: { id: clientePacoteId } });
  if (!cp) return false;

  await prisma.$transaction([
    prisma.clientPackageUsage.delete({ where: { id: ultimo.id } }),
    prisma.clientPackage.update({
      where: { id: clientePacoteId },
      data: {
        usosRestantes: cp.usosRestantes != null ? cp.usosRestantes + 1 : undefined,
        status: cp.status === "encerrado" ? "ativo" : cp.status,
      },
    }),
  ]);
  return true;
}

// Consumo automático: ao concluir um agendamento, desconta de um pacote ativo
// que cubra algum dos serviços do agendamento. Retorna o id do pacote usado.
export async function consumirPorAgendamento(agendamentoId: string): Promise<string | null> {
  const ag = await prisma.appointment.findUnique({
    where: { id: agendamentoId },
    include: { servicos: { select: { servicoId: true } } },
  });
  if (!ag) return null;

  // Já descontado para este agendamento? Evita duplicar.
  const jaUsado = await prisma.clientPackageUsage.findFirst({ where: { agendamentoId } });
  if (jaUsado) return null;

  const servicoIds = ag.servicos.map((s) => s.servicoId);
  if (servicoIds.length === 0) return null;

  // Pacotes ativos do cliente que incluem pelo menos um serviço do agendamento.
  const candidatos = await prisma.clientPackage.findMany({
    where: {
      clienteId: ag.clienteId,
      status: "ativo",
      pacote: { servicos: { some: { servicoId: { in: servicoIds } } } },
    },
    include: { pacote: { include: { servicos: { select: { servicoId: true } } } } },
    orderBy: { expiraEm: "asc" }, // gasta primeiro o que vence antes
  });

  for (const cp of candidatos) {
    const cobre = cp.pacote.servicos.find((s) => servicoIds.includes(s.servicoId));
    const r = await registrarUso(cp.id, {
      servicoId: cobre?.servicoId,
      agendamentoId,
      origem: "automatico",
    });
    if (r.ok) return cp.id;
  }
  return null;
}
