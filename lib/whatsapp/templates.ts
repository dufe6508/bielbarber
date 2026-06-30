// ─── Camada de WhatsApp (templates + link de clique-para-conversar) ──────────
// Estratégia atual: links wa.me — o admin clica, abre o WhatsApp já com a
// mensagem pronta para o número do cliente, e só envia. Custo zero, sem API.
// Esta camada é a base reutilizável: quando a API oficial (Meta Cloud / BSP)
// entrar, ela consome os MESMOS corpos de mensagem daqui — só muda o transporte
// (ver lib/notifications/whatsapp.ts).

export type TemplateWhatsApp =
  | "confirmar_agendamento"
  | "lembrete"
  | "agendamento_realizado"
  | "remarcado"
  | "cancelamento"
  | "cobranca_mensalidade"
  | "pacote_vencimento"
  | "pacote_saldo"
  | "aniversario";

export type VarsTemplate = {
  nome?: string;
  data?: string;
  hora?: string;
  servico?: string;
  saldo?: number | string;
};

// Primeiro nome, para um tom mais próximo.
function primeiroNome(nome?: string): string {
  return (nome ?? "").trim().split(/\s+/)[0] || "tudo bem";
}

export const TEMPLATES: Record<
  TemplateWhatsApp,
  { rotulo: string; construir: (v: VarsTemplate) => string }
> = {
  confirmar_agendamento: {
    rotulo: "Confirmar agendamento",
    construir: (v) =>
      `Olá, ${primeiroNome(v.nome)}!\n` +
      `Estamos confirmando seu atendimento no dia ${v.data} às ${v.hora}.\n` +
      `Poderia confirmar sua presença?`,
  },
  lembrete: {
    rotulo: "Lembrete",
    construir: (v) =>
      `Olá, ${primeiroNome(v.nome)}!\n` +
      `Passando para lembrar que seu atendimento será amanhã às ${v.hora}.\n` +
      `Estamos esperando por você.`,
  },
  agendamento_realizado: {
    rotulo: "Enviar confirmação",
    construir: (v) =>
      `Seu horário foi agendado com sucesso!\n\n` +
      `Data: ${v.data}\n` +
      `Horário: ${v.hora}` +
      (v.servico ? `\nServiço: ${v.servico}` : ""),
  },
  remarcado: {
    rotulo: "Avisar remarcação",
    construir: (v) =>
      `Seu atendimento foi remarcado.\n\n` +
      `Nova data: ${v.data}\n` +
      `Novo horário: ${v.hora}`,
  },
  cancelamento: {
    rotulo: "Informar cancelamento",
    construir: () =>
      `Informamos que seu atendimento foi cancelado.\n\n` +
      `Caso deseje, entre em contato para agendar um novo horário.`,
  },
  cobranca_mensalidade: {
    rotulo: "Cobrar mensalidade",
    construir: (v) =>
      `Olá, ${primeiroNome(v.nome)}!\n\n` +
      `Sua mensalidade está disponível para pagamento.\n` +
      `Caso já tenha realizado o pagamento, desconsidere esta mensagem.`,
  },
  pacote_vencimento: {
    rotulo: "Avisar vencimento",
    construir: (v) =>
      `Seu pacote está próximo do vencimento.\n` +
      `Ainda restam ${v.saldo} serviços disponíveis.\n` +
      `Aproveite antes da data limite.`,
  },
  pacote_saldo: {
    rotulo: "Avisar saldo",
    construir: (v) =>
      `Você possui apenas ${v.saldo} serviços restantes em seu pacote.`,
  },
  aniversario: {
    rotulo: "Parabenizar",
    construir: () =>
      `Feliz aniversário!\n\n` +
      `Desejamos muita saúde, felicidade e agradecemos por fazer parte da nossa história.`,
  },
};

export function montarMensagem(
  template: TemplateWhatsApp,
  vars: VarsTemplate = {}
): string {
  return TEMPLATES[template].construir(vars);
}

// Gera o link wa.me com DDI do Brasil (55) e a mensagem já codificada.
export function linkWhatsApp(telefone: string, texto: string): string {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  const numero = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

// Atalho: link direto a partir de um template + variáveis.
export function linkTemplate(
  telefone: string,
  template: TemplateWhatsApp,
  vars: VarsTemplate = {}
): string {
  return linkWhatsApp(telefone, montarMensagem(template, vars));
}
