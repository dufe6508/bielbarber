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
 *   "slots-{YYYY-MM-DD}"— slots disponíveis de uma data específica
 *
 * Para invalidar, importe `revalidateTag` de "next/cache" e chame:
 *   revalidateTag("servicos")
 *   revalidateTag(`slots-${data}`)
 */

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAgendaSemanal, getSlotsDisponiveis, getHorizonteDias } from "@/lib/utils/slots";

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

// ─── Slots disponíveis por data ────────────────────────────────────────────
// Cada data tem sua própria entrada de cache com tag `slots-YYYY-MM-DD`.
// TTL de 60 s como segurança extra (por se slots forem gerados concorrentemente).
export function cachedSlots(data: string) {
  return unstable_cache(
    async () => getSlotsDisponiveis(data),
    [`slots-${data}`],
    {
      tags: [`slots-${data}`],
      revalidate: 60,
    }
  )();
}
