// Lembra o último telefone usado (só dígitos) pra pré-preencher entre as telas
// (agendamento → meus agendamentos / mensalista). Sem login, só conveniência.
const CHAVE = "biel:telefone";

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
