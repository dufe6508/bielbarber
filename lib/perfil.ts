import { prisma } from "@/lib/prisma";

// Perfil da barbearia — guardado na tabela key-value `configuracoes` (Setting).
const CHAVES = {
  nome: "barbearia_nome",
  local: "barbearia_local",
  logo: "barbearia_logo_url",
} as const;

export type Perfil = { nome: string; local: string; logoUrl: string };

const PADRAO: Perfil = {
  nome: "Biel Barber",
  local: "Vale do Jatobá · BH",
  logoUrl: "/biel-logo.png",
};

export async function getPerfil(): Promise<Perfil> {
  const linhas = await prisma.setting.findMany({
    where: { chave: { in: Object.values(CHAVES) } },
  });
  const v = (c: string) => linhas.find((l) => l.chave === c)?.valor;
  return {
    nome: v(CHAVES.nome) || PADRAO.nome,
    local: v(CHAVES.local) || PADRAO.local,
    logoUrl: v(CHAVES.logo) || PADRAO.logoUrl,
  };
}

export async function setPerfil(p: Partial<Perfil>): Promise<void> {
  const ops: Promise<unknown>[] = [];
  const set = (chave: string, valor?: string) => {
    if (typeof valor !== "string") return;
    const v = valor.trim();
    ops.push(
      prisma.setting.upsert({
        where: { chave },
        update: { valor: v },
        create: { chave, valor: v },
      })
    );
  };
  set(CHAVES.nome, p.nome);
  set(CHAVES.local, p.local);
  set(CHAVES.logo, p.logoUrl);
  await Promise.all(ops);
}
