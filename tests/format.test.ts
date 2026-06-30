import { describe, it, expect } from "vitest";
import {
  formatarTelefone,
  telefoneNumeros,
  formatarPreco,
  paraData,
} from "@/lib/utils/format";

// Telefone e preço sustentam o cadastro de clientes e a exibição de valores
// (pagamentos). Regressão aqui quebra fluxos centrais.
describe("formatarTelefone", () => {
  it("formata celular de 11 dígitos", () => {
    expect(formatarTelefone("31999842829")).toBe("(31) 99984-2829");
  });

  it("formata fixo de 10 dígitos", () => {
    expect(formatarTelefone("3133334444")).toBe("(31) 3333-4444");
  });

  it("ignora caracteres não numéricos e limita a 11 dígitos", () => {
    expect(formatarTelefone("(31) 99984-2829 extra")).toBe("(31) 99984-2829");
  });

  it("retorna vazio para string vazia", () => {
    expect(formatarTelefone("")).toBe("");
  });
});

describe("telefoneNumeros", () => {
  it("extrai apenas dígitos", () => {
    expect(telefoneNumeros("(31) 99984-2829")).toBe("31999842829");
  });
});

describe("formatarPreco", () => {
  it("formata número como moeda BRL", () => {
    expect(formatarPreco(45).replace(/ /g, " ")).toBe("R$ 45,00");
  });

  it("aceita string numérica", () => {
    expect(formatarPreco("30.5").replace(/ /g, " ")).toBe("R$ 30,50");
  });
});

describe("paraData", () => {
  it("ancora data curta na meia-noite local", () => {
    const d = paraData("2026-06-30");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5); // junho
    expect(d.getDate()).toBe(30);
    expect(d.getHours()).toBe(0);
  });

  it("repassa Date inalterado", () => {
    const orig = new Date(2026, 0, 1, 12);
    expect(paraData(orig)).toBe(orig);
  });
});
