// Lembra o último telefone/nome usado pra pré-preencher entre as telas
// (agendamento → meus agendamentos / mensalista). Sem login, só conveniência.
const CHAVE = "biel:telefone";
const CHAVE_NOME = "biel:nome";

export function lembrarTelefone(digitos: string) {
  if (typeof window === "undefined") return;
  if (digitos.replace(/\D/g, "").length < 10) return;
  try {
    window.localStorage.setItem(CHAVE, digitos.replace(/\D/g, ""));
  } catch {
    /* localStorage indisponível — ignora */
  }
}

export function telefoneLembrado(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(CHAVE) ?? "";
  } catch {
    return "";
  }
}

export function lembrarNome(nome: string) {
  if (typeof window === "undefined") return;
  if (nome.trim().length < 2) return;
  try {
    window.localStorage.setItem(CHAVE_NOME, nome.trim());
  } catch {
    /* localStorage indisponível — ignora */
  }
}

export function nomeLembrado(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(CHAVE_NOME) ?? "";
  } catch {
    return "";
  }
}
