import { describe, it, expect, vi } from "vitest";

const findUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { appointment: { findUnique: (...a: unknown[]) => findUnique(...a) } },
}));

import { eventoDoAgendamento } from "@/lib/calendar";

describe("eventoDoAgendamento", () => {
  it("título traz cliente + serviço, descrição traz os detalhes e sem localização", async () => {
    findUnique.mockResolvedValue({
      id: "ag1",
      data: new Date("2026-07-03T00:00:00Z"),
      horarioInicio: "17:00",
      slots: 1,
      valorTotal: 45,
      cliente: { nome: "Pedro Fernandes", telefone: "31999999999" },
      servicos: [{ servico: { nome: "Corte Fade" } }],
    });

    const evento = await eventoDoAgendamento("ag1");

    expect(evento).not.toBeNull();
    // Título = nome + serviço (não só o nome).
    expect(evento!.titulo).toBe("Pedro Fernandes · Corte Fade");
    // Descrição traz cliente, serviço, horário, telefone e valor.
    expect(evento!.descricao).toContain("Cliente: Pedro Fernandes");
    expect(evento!.descricao).toContain("Serviço: Corte Fade");
    expect(evento!.descricao).toContain("Horário: 17:00");
    expect(evento!.descricao).toContain("Valor:");
    // Sem localização/endereço no evento.
    expect(evento!.local).toBe("");
    expect(evento!.descricao).not.toContain("Serrinha");
  });
});
