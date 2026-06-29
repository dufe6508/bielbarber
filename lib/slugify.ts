// Gera identificador URL-safe a partir de um nome.
// "Corte Americano" → "corte-americano". Usado para deep links.
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Garante slug único: se `base` colidir, anexa -2, -3, ... até achar livre.
// `existe` consulta o banco (retorna true se o slug já está em uso).
export async function slugUnico(
  nome: string,
  existe: (slug: string) => Promise<boolean>
): Promise<string> {
  const base = slugify(nome) || "item";
  let slug = base;
  let n = 2;
  while (await existe(slug)) {
    slug = `${base}-${n++}`;
  }
  return slug;
}
