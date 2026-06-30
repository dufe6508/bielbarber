import { describe, it, expect, vi } from "vitest";

// Evita que o import real construa o PrismaClient (precisa de DATABASE_URL).
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { inicioPeriodo } from "@/lib/admin/metrics";

// Base do resumo financeiro (dia/semana/mês). A janela define o que entra em
// cada cartão — um erro aqui distorce o faturamento mostrado.
describe("inicioPeriodo", () => {
  // Quinta-feira, 25 de junho de 2026, 15h30.
  const ref = new Date(2026, 5, 25, 15, 30, 0);

  it("dia → meia-noite do próprio dia", () => {
    const d = inicioPeriodo("dia", ref);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(25);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it("semana → segunda-feira anterior (semana começa na segunda)", () => {
    const d = inicioPeriodo("semana", ref);
    expect(d.getDay()).toBe(1); // segunda
    expect(d.getDate()).toBe(22); // 22/06/2026 é segunda
    expect(d.getHours()).toBe(0);
  });

  it("mes → dia 1 do mês", () => {
    const d = inicioPeriodo("mes", ref);
    expect(d.getDate()).toBe(1);
    expect(d.getMonth()).toBe(5);
  });

  it("semana a partir de um domingo volta à segunda da mesma semana", () => {
    // Domingo, 28/06/2026.
    const domingo = new Date(2026, 5, 28, 10, 0, 0);
    const d = inicioPeriodo("semana", domingo);
    expect(d.getDay()).toBe(1);
    expect(d.getDate()).toBe(22);
  });
});
