import { prisma } from "@/lib/prisma";
import { notify } from "./notify";
import { getSlotsDisponiveis } from "@/lib/utils/slots";
import { dataISOLocal } from "@/lib/utils/format";

// ─── Varreduras diárias (cron) ──────────────────────────────────────────────
// Geram notificações de gestão para o admin: resumo do dia, estoque baixo,
// meta batida e baixa ocupação. Todas idempotentes via dedup na inbox.

const ESTOQUE_LIMIAR = 3;

// Já existe notificação de admin recente com este metadado? (evita repetição)
async function jaNotificou(
  chave: string,
  valor: string | number,
  desde: Date
): Promise<boolean> {
  const n = await prisma.notification.findFirst({
    where: {
      audiencia: "admin",
      criadoEm: { gte: desde },
      metadata: { path: [chave], equals: valor },
    },
    select: { id: true },
  });
  return Boolean(n);
}

// Dedup para notificações de cliente com um metadado específico.
async function jaNotificouCliente(
  chave: string,
  valor: string | number,
  desde: Date
): Promise<boolean> {
  const n = await prisma.notification.findFirst({
    where: {
      audiencia: "cliente",
      criadoEm: { gte: desde },
      metadata: { path: [chave], equals: valor },
    },
    select: { id: true },
  });
  return Boolean(n);
}

const PACOTE_VENCE_EM_DIAS = 3;

// Pacotes vencendo/vencidos: marca os vencidos como expirados e avisa o
// cliente; avisa também os que vencem nos próximos dias. Dedup 3 dias/pacote.
export async function pacotesVencendo(): Promise<void> {
  const agora = new Date();
  const limite = new Date(agora.getTime() + PACOTE_VENCE_EM_DIAS * 24 * 60 * 60 * 1000);

  // Vencidos ainda marcados como ativos → expira e avisa (transição única).
  const vencidos = await prisma.clientPackage.findMany({
    where: { status: "ativo", expiraEm: { lt: agora } },
    select: { id: true },
  });
  for (const cp of vencidos) {
    await prisma.clientPackage.update({ where: { id: cp.id }, data: { status: "expirado" } });
    await notify({ type: "pacote_expirado", clientePacoteId: cp.id });
  }

  // Vencendo nos próximos dias (ativos).
  const vencendo = await prisma.clientPackage.findMany({
    where: { status: "ativo", expiraEm: { gte: agora, lte: limite } },
    select: { id: true, expiraEm: true },
  });
  const tresDias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  for (const cp of vencendo) {
    if (!cp.expiraEm) continue;
    if (await jaNotificouCliente("clientePacoteId", cp.id, tresDias)) continue;
    const daysLeft = Math.ceil(
      (cp.expiraEm.getTime() - agora.getTime()) / (24 * 60 * 60 * 1000)
    );
    await notify({ type: "pacote_vencendo", clientePacoteId: cp.id, daysLeft });
  }
}

// Resumo do dia: cortes concluídos, pendências de pagamento, faturamento.
export async function resumoDiario(): Promise<void> {
  const hoje = new Date();
  const ini = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const fim = new Date(ini.getTime() + 24 * 60 * 60 * 1000);

  const ags = await prisma.appointment.findMany({
    where: { data: { gte: ini, lt: fim }, status: { not: "cancelado" } },
    select: { status: true, statusPagamento: true, valorTotal: true },
  });

  const cortes = ags.filter((a) => a.status === "concluido").length;
  const pendencias = ags.filter((a) => a.statusPagamento === "pendente").length;
  const faturamento = ags
    .filter((a) => a.statusPagamento === "pago")
    .reduce((s, a) => s + Number(a.valorTotal), 0);

  // Só envia se houve movimento (não notifica dia vazio/folga).
  if (ags.length === 0) return;
  await notify({ type: "resumo_diario", cortes, pendencias, faturamento });
}

// Estoque baixo: produtos ativos com quantidade <= limiar. Dedup 3 dias/produto.
export async function estoqueBaixo(): Promise<void> {
  const baixos = await prisma.product.findMany({
    where: { ativo: true, quantidadeEstoque: { lte: ESTOQUE_LIMIAR } },
    select: { id: true },
  });
  const tresDias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  for (const p of baixos) {
    if (await jaNotificou("productId", p.id, tresDias)) continue;
    await notify({ type: "estoque_baixo", productId: p.id });
  }
}

// Meta mensal batida: setting "meta_mensal" (>0 ativa). Dedup 1x/mês.
export async function metaBatida(): Promise<void> {
  const cfg = await prisma.setting.findUnique({ where: { chave: "meta_mensal" } });
  const meta = cfg ? Number(cfg.valor) : 0;
  if (!meta || meta <= 0) return;

  const hoje = new Date();
  const iniMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ags = await prisma.appointment.findMany({
    where: { data: { gte: iniMes }, statusPagamento: "pago" },
    select: { valorTotal: true },
  });
  const faturamento = ags.reduce((s, a) => s + Number(a.valorTotal), 0);
  if (faturamento < meta) return;

  // Dedup: 1 aviso por mês (notificação meta_batida deste mês carrega metadata.meta).
  if (await jaNotificou("meta", meta, iniMes)) return;
  await notify({ type: "meta_batida", valor: faturamento, meta });
}

// Baixa ocupação amanhã: dia aberto com poucos agendamentos. Dedup por data.
export async function baixaOcupacao(): Promise<void> {
  const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const iso = dataISOLocal(amanha);

  const livres = await getSlotsDisponiveis(iso);
  if (livres.length === 0) return; // dia fechado ou lotado → não é "baixa ocupação"

  const ini = new Date(amanha.getFullYear(), amanha.getMonth(), amanha.getDate());
  const fim = new Date(ini.getTime() + 24 * 60 * 60 * 1000);
  const ocupados = await prisma.appointment.count({
    where: { data: { gte: ini, lt: fim }, status: { not: "cancelado" } },
  });

  const total = livres.length + ocupados;
  if (total === 0) return;
  const ocupacao = Math.round((ocupados / total) * 100);
  if (ocupacao >= 40) return; // ocupação ok

  const tresDias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  if (await jaNotificou("data", iso, tresDias)) return;
  await notify({ type: "baixa_ocupacao", data: iso, ocupacao });
}

// Roda todas as varreduras diárias.
export async function varredurasDiarias(): Promise<void> {
  await resumoDiario().catch((e) => console.error("[sweep] resumoDiario", e));
  await estoqueBaixo().catch((e) => console.error("[sweep] estoqueBaixo", e));
  await metaBatida().catch((e) => console.error("[sweep] metaBatida", e));
  await baixaOcupacao().catch((e) => console.error("[sweep] baixaOcupacao", e));
  await pacotesVencendo().catch((e) => console.error("[sweep] pacotesVencendo", e));
}
