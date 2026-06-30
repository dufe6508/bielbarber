import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do prisma: só precisamos controlar a contagem de usos na semana.
const contarUsos = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { clientPackageUsage: { count: (...a: unknown[]) => contarUsos(...a) } },
}));
// notify não deve disparar nada real nos testes.
vi.mock("@/lib/notifications/notify", () => ({ notify: vi.fn() }));

import { calcularSaldo } from "@/lib/packages";

// Monta um ClientPackage + pacote com os campos que calcularSaldo usa.
function fazerPacote(over: Record<string, unknown> = {}, pacoteOver: Record<string, unknown> = {}) {
  return {
    id: "cp1",
    clienteId: "c1",
    pacoteId: "p1",
    compradoEm: new Date(),
    usosTotais: 5,
    usosRestantes: 3,
    expiraEm: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    status: "ativo",
    ...over,
    pacote: { id: "p1", nome: "5 Cortes", limiteSemanal: null, ...pacoteOver },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

beforeEach(() => {
  contarUsos.mockReset();
  contarUsos.mockResolvedValue(0);
});

describe("calcularSaldo — bloqueios", () => {
  it("pacote saudável não fica bloqueado", async () => {
    const s = await calcularSaldo(fazerPacote());
    expect(s.bloqueado).toBe(false);
    expect(s.motivo).toBeNull();
    expect(s.usosRestantes).toBe(3);
    expect(s.diasParaVencer).toBeGreaterThan(0);
  });

  it("bloqueia quando vencido", async () => {
    const s = await calcularSaldo(
      fazerPacote({ expiraEm: new Date(Date.now() - 24 * 60 * 60 * 1000) })
    );
    expect(s.bloqueado).toBe(true);
    expect(s.motivo).toBe("expirado");
  });

  it("bloqueia quando sem saldo (encerrado)", async () => {
    const s = await calcularSaldo(fazerPacote({ usosRestantes: 0 }));
    expect(s.bloqueado).toBe(true);
    expect(s.motivo).toBe("encerrado");
  });

  it("bloqueia ao atingir o limite semanal", async () => {
    contarUsos.mockResolvedValue(2); // já usou 2 nesta semana
    const s = await calcularSaldo(fazerPacote({}, { limiteSemanal: 2 }));
    expect(s.bloqueado).toBe(true);
    expect(s.motivo).toBe("limite_semanal");
    expect(s.usosNaSemana).toBe(2);
  });

  it("não bloqueia abaixo do limite semanal", async () => {
    contarUsos.mockResolvedValue(1);
    const s = await calcularSaldo(fazerPacote({}, { limiteSemanal: 3 }));
    expect(s.bloqueado).toBe(false);
    expect(s.limiteSemanal).toBe(3);
  });

  it("vencimento tem prioridade sobre limite semanal", async () => {
    contarUsos.mockResolvedValue(5);
    const s = await calcularSaldo(
      fazerPacote({ expiraEm: new Date(Date.now() - 1000) }, { limiteSemanal: 1 })
    );
    expect(s.motivo).toBe("expirado");
  });
});
