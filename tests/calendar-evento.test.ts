import { describe, it, expect, vi } from "vitest";

const findUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { appointment: { findUnique: (...a: unknown[]) => findUnique(...a) } },
}));

import { eventoDoAgendamento } from "@/lib/calendar";

describe("eventoDoAgendamento", () => {
  it("prioriza cliente/serviço/horário no título e na descrição", async () => {
    findUnique.mockResolvedValue({
      id: "ag1",
      data: new Date("2026-07-03T00:00:00Z"),
      horarioInicio: "17:00",
      slots: 1,
      cliente: { nome: "Pedro Fernandes", telefone: "31999999999" },
      servicos: [{ servico: { nome: "Corte Fade" } }],
    });

    const evento = await eventoDoAgendamento("ag1");

    expect(evento).not.toBeNull();
    // Título = nome do cliente (não mais "Corte · Biel Barber Shop").
    expect(evento!.titulo).toBe("Pedro Fernandes");
    // Descrição traz serviço e horário; empresa vira info secundária (última linha).
    expect(evento!.descricao).toBe("Serviço: Corte Fade\nHorário: 17:00\nBiel Barber Shop");
    // Endereço continua no campo `local` (secundário), sem duplicar no destaque.
    expect(evento!.local).toContain("Serrinha");
  });
});
