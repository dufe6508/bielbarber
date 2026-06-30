import { describe, it, expect } from "vitest";
import {
  montarMensagem,
  linkWhatsApp,
  linkTemplate,
  TEMPLATES,
} from "@/lib/whatsapp/templates";

// A camada de WhatsApp alimenta os botões de mensagem rápida. Os corpos de
// mensagem e o link wa.me precisam ficar estáveis (e prontos para a API futura).
describe("montarMensagem", () => {
  it("preenche nome, data e hora na confirmação de presença", () => {
    const msg = montarMensagem("confirmacao_presenca", {
      nome: "Pedro Silva",
      data: "30/06",
      hora: "10:00",
    });
    expect(msg).toContain("Pedro"); // usa primeiro nome
    expect(msg).not.toContain("Silva");
    expect(msg).toContain("30/06");
    expect(msg).toContain("10:00");
  });

  it("aplica padrões institucionais (empresa/endereço) sem precisar passar", () => {
    const msg = montarMensagem("agendamento_realizado", {
      nome: "Ana",
      data: "01/07",
      hora: "09:00",
      servico: "Corte",
    });
    expect(msg).toContain("Biel Barber Shop");
    expect(msg).toContain("Av. Serrinha");
  });

  it("inclui o saldo no aviso de saldo do pacote", () => {
    expect(montarMensagem("pacote_saldo", { saldo: 2 })).toContain("2 serviços");
  });

  it("monta o serviço só quando informado", () => {
    const com = montarMensagem("agendamento_realizado", {
      data: "30/06",
      hora: "10:00",
      servico: "Corte",
    });
    const sem = montarMensagem("agendamento_realizado", { data: "30/06", hora: "10:00" });
    expect(com).toContain("Serviço: Corte");
    expect(sem).not.toContain("Serviço:");
  });

  it("todos os templates têm rótulo e produzem texto não vazio", () => {
    for (const t of Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]) {
      expect(TEMPLATES[t].rotulo.length).toBeGreaterThan(0);
      expect(montarMensagem(t, { nome: "Ana", data: "01/01", hora: "09:00", saldo: 1 }).length)
        .toBeGreaterThan(0);
    }
  });
});

describe("linkWhatsApp", () => {
  it("adiciona DDI 55 e codifica a mensagem", () => {
    const url = linkWhatsApp("31999842829", "olá mundo");
    expect(url).toBe("https://wa.me/5531999842829?text=ol%C3%A1%20mundo");
  });

  it("não duplica o DDI quando já presente", () => {
    expect(linkWhatsApp("5531999842829", "x")).toContain("wa.me/5531999842829");
  });

  it("ignora máscara do telefone", () => {
    expect(linkWhatsApp("(31) 99984-2829", "x")).toContain("wa.me/5531999842829");
  });
});

describe("linkTemplate", () => {
  it("gera link direto a partir do template", () => {
    const url = linkTemplate("31999842829", "agendamento_realizado", { nome: "Ana" });
    expect(url.startsWith("https://wa.me/5531999842829?text=")).toBe(true);
    expect(decodeURIComponent(url)).toContain("Biel Barber Shop");
  });
});
