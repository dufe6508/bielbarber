/**
 * lib/cache.ts
 *
 * Cache centralizado via `unstable_cache` do Next.js.
 * Persiste resultados entre requests no processo servidor, sem Redis.
 *
 * Tags disponíveis:
 *   "servicos"          — lista de serviços ativos
 *   "produtos"          — lista de produtos ativos
 *   "agenda-semanal"    — agenda padrão dos 7 dias da semana
 *   "config"            — configurações (horizonte de agendamento)
 *
 * Para invalidar, importe `revalidateTag` de "next/cache" e chame:
 *   revalidateTag("servicos")
 *
 * Slots disponíveis (getSlotsDisponiveis) NÃO passam por cache: a invalidação
 * por tag não se mostrou confiável aqui e disponibilidade errada (cache
 * desatualizado após cancelar/remarcar) é pior que uma query a mais.
 */

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAgendaSemanal, getHorizonteDias } from "@/lib/utils/slots";

// ─── Serviços ativos ───────────────────────────────────────────────────────
export const cachedServicos = unstable_cache(
  async () => {
    return prisma.service.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    });
  },
  ["servicos"],
  { tags: ["servicos"] }
);

// ─── Produtos ativos ───────────────────────────────────────────────────────
export const cachedProdutos = unstable_cache(
  async () => {
    return prisma.product.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    });
  },
  ["produtos"],
  { tags: ["produtos"] }
);

// ─── Agenda semanal (7 dias, padrão + edições do barbeiro) ─────────────────
export const cachedAgendaSemanal = unstable_cache(
  async () => getAgendaSemanal(),
  ["agenda-semanal"],
  { tags: ["agenda-semanal"] }
);

// ─── Configurações (horizonte de agendamento) ──────────────────────────────
export const cachedHorizonteDias = unstable_cache(
  async () => getHorizonteDias(),
  ["config"],
  { tags: ["config"] }
);
