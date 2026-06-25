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

// Data DD/MM/AAAA
export function formatarData(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data + "T00:00:00") : data;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Data por extenso curta: "qui, 26 jun"
export function formatarDataExtenso(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data + "T00:00:00") : data;
  return d.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

// YYYY-MM-DD para chave/banco
export function dataISO(data: Date): string {
  return data.toISOString().split("T")[0];
}
