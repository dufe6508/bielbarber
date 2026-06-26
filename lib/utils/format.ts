// Formatação de moeda em R$
export function formatarPreco(valor: number | string): string {
  const num = typeof valor === "string" ? parseFloat(valor) : valor;
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Máscara de telefone: (31) 99999-9999
export function formatarTelefone(valor: string): string {
  const nums = valor.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 2) return nums.length ? `(${nums}` : "";
  if (nums.length <= 6) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  if (nums.length <= 10)
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
}

// Telefone só com dígitos (para salvar no banco)
export function telefoneNumeros(valor: string): string {
  return valor.replace(/\D/g, "");
}

// Converte para Date aceitando "YYYY-MM-DD" OU ISO completo ("...T..Z").
// Só a forma curta (data pura) recebe a âncora de meia-noite local.
export function paraData(data: Date | string): Date {
  if (data instanceof Date) return data;
  return /^\d{4}-\d{2}-\d{2}$/.test(data)
    ? new Date(data + "T00:00:00")
    : new Date(data);
}

// Data DD/MM/AAAA
export function formatarData(data: Date | string): string {
  return paraData(data).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Data por extenso curta: "qui, 26 jun"
export function formatarDataExtenso(data: Date | string): string {
  return paraData(data).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

// YYYY-MM-DD para chave/banco
export function dataISO(data: Date): string {
  return data.toISOString().split("T")[0];
}

// YYYY-MM-DD em horário local (sem deslocar pro UTC do dia anterior)
export function dataISOLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// "Junho 2026" — capitalizado
export function nomeMesAno(data: Date | string): string {
  const s = paraData(data).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Rótulo relativo curto: "Hoje" | "Amanhã" | "qui" (weekday abreviado)
export function rotuloRelativo(data: Date | string): string {
  const d = paraData(data);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(d);
  alvo.setHours(0, 0, 0, 0);
  const difDias = Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
  if (difDias === 0) return "Hoje";
  if (difDias === 1) return "Amanhã";
  return d
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "");
}
