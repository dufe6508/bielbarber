import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do prisma: simula a corrida de 2 chamadas concorrentes de confirmarPagamento
// para a MESMA cobrança (ex.: webhook do Mercado Pago reentregue). O `updateMany`
// com guard de status é o que decide quem "ganha" o processamento.
const updateMany = vi.fn();
const findUnique = vi.fn();
const update = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscriptionCharge: {
      updateMany: (...a: unknown[]) => updateMany(...a),
      findUnique: (...a: unknown[]) => findUnique(...a),
      update: (...a: unknown[]) => update(...a),
    },
  },
}));

// @prisma/client não está gerado neste sandbox (download do engine bloqueado
// pela política de rede) — mocka só o que charges.ts usa em runtime (o
// namespace `Prisma`, pro enum de isolation level da transação).
vi.mock("@prisma/client", () => ({ Prisma: { TransactionIsolationLevel: { Serializable: "Serializable" } } }));

const ativarPacote = vi.fn();
vi.mock("@/lib/packages", () => ({ ativarPacote: (...a: unknown[]) => ativarPacote(...a) }));
vi.mock("@/lib/notifications/notify", () => ({ notify: vi.fn() }));
vi.mock("@/lib/mercadopago", () => ({ criarPreferencia: vi.fn() }));
vi.mock("@/lib/utils/slots", () => ({ getSlotsDisponiveis: vi.fn(), proximaHora: vi.fn() }));
vi.mock("@/lib/calendar", () => ({ sincronizarAgenda: vi.fn() }));

import { confirmarPagamento } from "@/lib/billing/charges";

function fazerCharge(over: Record<string, unknown> = {}) {
  return {
    id: "charge1",
    tipo: "pacote",
    clienteId: "c1",
    pacoteId: "p1",
    clientePacoteId: null,
    valor: 100,
    status: "pendente",
    ...over,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

beforeEach(() => {
  updateMany.mockReset();
  findUnique.mockReset();
  update.mockReset();
  ativarPacote.mockReset();
  ativarPacote.mockResolvedValue({ id: "cp1" });
  update.mockImplementation((args: { data: Record<string, unknown> }) => ({
    ...fazerCharge(),
    ...args.data,
  }));
});

describe("confirmarPagamento — idempotência sob concorrência", () => {
  it("2 chamadas concorrentes para a mesma cobrança só processam 1 vez", async () => {
    // 1ª chamada reivindica (count 1); a 2ª chega tarde e não reivindica nada (count 0) —
    // exatamente o que acontece quando o MP reentrega o mesmo webhook de pagamento.
    updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    findUnique.mockResolvedValue(fazerCharge());

    const [a, b] = await Promise.all([
      confirmarPagamento("charge1"),
      confirmarPagamento("charge1"),
    ]);

    expect(ativarPacote).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(a).toBeDefined();
    expect(b).toBeDefined();
  });

  it("cobrança já paga: não reprocessa (no-op)", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    findUnique.mockResolvedValue(fazerCharge({ status: "pago" }));

    const resultado = await confirmarPagamento("charge1");

    expect(ativarPacote).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(resultado.status).toBe("pago");
  });
});
