// ─── Camada de WhatsApp (templates + variáveis + link wa.me) ─────────────────
// FONTE ÚNICA das mensagens enviadas ao cliente pelo WhatsApp. Nenhuma mensagem
// fixa deve viver espalhada pelo código — tudo passa por aqui. Estratégia atual:
// links wa.me (o admin clica, abre o WhatsApp já preenchido para o número do
// cliente e só envia). Custo zero, sem API. Quando a API oficial (Meta Cloud /
// BSP) entrar, ela consome os MESMOS textos daqui — só muda o transporte.
//
// Arquitetura desta camada:
//   1. TEMPLATES        — texto de cada situação, com variáveis {{...}}
//   2. substituirVariaveis — serviço que troca as variáveis pelos valores
//   3. linkWhatsApp     — monta a URL wa.me com a mensagem pronta
//   4. abrirWhatsApp    — abre a API do WhatsApp já com a mensagem montada
// Alterar uma mensagem = mexer em UM lugar (o objeto TEMPLATES).

// Dados da empresa usados como padrão nas variáveis institucionais.
export const DADOS_EMPRESA = {
  empresa: "Biel Barber Shop",
  profissional: "Biel",
  endereco: "Av. Serrinha, 82 · Vale do Jatobá, BH",
} as const;

// Situações que possuem mensagem própria. O id é estável (não muda o texto).
export type TemplateWhatsApp =
  | "agendamento_realizado" // 1
  | "confirmacao_presenca" // 2
  | "agendamento_confirmado" // 3
  | "lembrete" // 4
  | "remarcado" // 5
  | "cancelamento" // 6
  | "solicitacao_pagamento" // 7
  | "mensalidade_disponivel" // 8
  | "pagamento_confirmado" // 9
  | "pacote_ativado" // 10
  | "pacote_vencimento" // 11
  | "pacote_saldo" // 12
  | "pacote_encerrado" // 13
  | "convite_reagendamento"; // 14

// Variáveis disponíveis para os templates. Institucionais (empresa, profissional,
// endereço) têm padrão; o resto vem do contexto da tela que abre a mensagem.
export type VarsTemplate = {
  nome?: string;
  servico?: string;
  profissional?: string;
  data?: string;
  hora?: string;
  valor?: string | number;
  empresa?: string;
  endereco?: string;
  saldo?: number | string;
};

// Primeiro nome, para um tom mais próximo. Vazio vira "tudo bem".
function primeiroNome(nome?: string): string {
  return (nome ?? "").trim().split(/\s+/)[0] || "tudo bem";
}

// Mapeia o nome da variável (inclusive acentuado, como o usuário escreve) para a
// chave interna. Aceita {{serviço}} e {{servico}}, {{endereço}} e {{endereco}}.
const ALIAS_VARIAVEIS: Record<string, keyof VarsTemplate | "nome"> = {
  nome: "nome",
  servico: "servico",
  "serviço": "servico",
  profissional: "profissional",
  data: "data",
  hora: "hora",
  valor: "valor",
  empresa: "empresa",
  endereco: "endereco",
  "endereço": "endereco",
  saldo: "saldo",
};

// ─── Serviço de substituição de variáveis ───────────────────────────────────
// Troca todas as ocorrências de {{variavel}} pelos valores, aplicando padrões
// institucionais e o primeiro nome. Linhas cujo valor ficou vazio (ex.: um
// "Serviço: " sem serviço) são removidas para a mensagem não sair quebrada.
export function substituirVariaveis(texto: string, vars: VarsTemplate = {}): string {
  const valores: Record<string, string> = {
    empresa: String(vars.empresa ?? DADOS_EMPRESA.empresa),
    profissional: String(vars.profissional ?? DADOS_EMPRESA.profissional),
    endereco: String(vars.endereco ?? DADOS_EMPRESA.endereco),
    nome: primeiroNome(vars.nome),
    servico: vars.servico != null ? String(vars.servico) : "",
    data: vars.data != null ? String(vars.data) : "",
    hora: vars.hora != null ? String(vars.hora) : "",
    valor: vars.valor != null ? String(vars.valor) : "",
    saldo: vars.saldo != null ? String(vars.saldo) : "",
  };

  let out = texto.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, bruto: string) => {
    const chave = ALIAS_VARIAVEIS[bruto.trim().toLowerCase()];
    return chave ? valores[chave] ?? "" : "";
  });

  // Remove linhas que viraram só "Rótulo:" (valor vazio) e normaliza espaços.
  out = out
    .split("\n")
    .filter((linha) => !/^\s*[^:\n]+:\s*$/.test(linha))
    .join("\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return out;
}

// ─── Templates (texto + rótulo do botão) ─────────────────────────────────────
export const TEMPLATES: Record<
  TemplateWhatsApp,
  { rotulo: string; texto: string }
> = {
  agendamento_realizado: {
    rotulo: "Enviar confirmação",
    texto:
      `Olá, {{nome}}! ✂️\n` +
      `Seu horário na {{empresa}} está agendado.\n\n` +
      `📅 {{data}} às {{hora}}\n` +
      `Serviço: {{serviço}}\n` +
      `📍 {{endereço}}\n\n` +
      `Qualquer coisa, é só chamar!`,
  },
  confirmacao_presenca: {
    rotulo: "Confirmar presença",
    texto:
      `Olá, {{nome}}!\n` +
      `Tudo certo para o seu horário do dia {{data}} às {{hora}}?\n\n` +
      `Pode confirmar sua presença, por favor? ✅`,
  },
  agendamento_confirmado: {
    rotulo: "Enviar confirmação",
    texto:
      `Tudo confirmado, {{nome}}! ✅\n` +
      `Seu horário está garantido.\n\n` +
      `📅 {{data}} às {{hora}}\n` +
      `📍 {{endereço}}\n\n` +
      `Até lá!`,
  },
  lembrete: {
    rotulo: "Enviar lembrete",
    texto:
      `Oi, {{nome}}! ⏰\n` +
      `Passando para lembrar do seu horário hoje às {{hora}}.\n\n` +
      `Te espero na {{empresa}}!`,
  },
  remarcado: {
    rotulo: "Avisar remarcação",
    texto:
      `Olá, {{nome}}!\n` +
      `Seu atendimento foi remarcado.\n\n` +
      `📅 Nova data: {{data}}\n` +
      `⏰ Novo horário: {{hora}}\n\n` +
      `Qualquer dúvida, estou à disposição.`,
  },
  cancelamento: {
    rotulo: "Avisar cancelamento",
    texto:
      `Olá, {{nome}}!\n` +
      `Seu atendimento do dia {{data}} às {{hora}} foi cancelado.\n\n` +
      `Quando quiser, é só chamar para remarcar. 👍`,
  },
  solicitacao_pagamento: {
    rotulo: "Cobrar cliente",
    texto:
      `Olá, {{nome}}!\n` +
      `Consta um pagamento pendente referente ao seu atendimento.\n` +
      `Valor: {{valor}}\n\n` +
      `Quando puder, é só acertar. Se já pagou, desconsidere. 🙏`,
  },
  mensalidade_disponivel: {
    rotulo: "Enviar cobrança",
    texto:
      `Olá, {{nome}}!\n` +
      `Sua mensalidade na {{empresa}} já está disponível para pagamento.\n` +
      `Valor: {{valor}}\n\n` +
      `Se já realizou o pagamento, é só desconsiderar. 🙏`,
  },
  pagamento_confirmado: {
    rotulo: "Enviar confirmação",
    texto:
      `Pagamento confirmado, {{nome}}! ✅\n` +
      `Valor: {{valor}}\n\n` +
      `Obrigado e até a próxima!`,
  },
  pacote_ativado: {
    rotulo: "Informar ativação",
    texto:
      `Olá, {{nome}}! 🎉\n` +
      `Seu pacote na {{empresa}} foi ativado.\n\n` +
      `Serviços disponíveis: {{saldo}}\n\n` +
      `É só vir aproveitar!`,
  },
  pacote_vencimento: {
    rotulo: "Avisar vencimento",
    texto:
      `Olá, {{nome}}!\n` +
      `Seu pacote está perto de vencer.\n\n` +
      `Serviços restantes: {{saldo}}\n\n` +
      `Aproveite antes do prazo. ⏳`,
  },
  pacote_saldo: {
    rotulo: "Avisar saldo",
    texto:
      `Olá, {{nome}}!\n` +
      `Você ainda tem {{saldo}} serviços disponíveis no seu pacote.\n\n` +
      `Quando quiser usar, é só agendar. 😉`,
  },
  pacote_encerrado: {
    rotulo: "Informar encerramento",
    texto:
      `Olá, {{nome}}!\n` +
      `Seu pacote foi encerrado — os serviços foram utilizados ou a validade expirou.\n\n` +
      `Quando quiser renovar, é só chamar! 👍`,
  },
  convite_reagendamento: {
    rotulo: "Convidar para reagendar",
    texto:
      `Olá, {{nome}}!\n` +
      `Abriu um horário na {{empresa}} e lembrei de você. 😊\n\n` +
      `Quer aproveitar para agendar? É só me chamar.`,
  },
};

// Monta o texto final de um template já com as variáveis substituídas.
export function montarMensagem(
  template: TemplateWhatsApp,
  vars: VarsTemplate = {}
): string {
  return substituirVariaveis(TEMPLATES[template].texto, vars);
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

// Abre a API do WhatsApp (wa.me) já com a mensagem montada. Uso no cliente.
export function abrirWhatsApp(
  telefone: string,
  template: TemplateWhatsApp,
  vars: VarsTemplate = {}
): void {
  if (typeof window === "undefined") return;
  window.open(linkTemplate(telefone, template, vars), "_blank", "noopener,noreferrer");
}
