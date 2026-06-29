import { prisma } from "@/lib/prisma";
import { telefoneNumeros } from "@/lib/utils/format";

// Helpers de leitura/escrita da inbox compartilhados pelas rotas.
// Cliente é resolvido pelo telefone (sem login) — a "autorização" é provar
// posse do número. Admin é gateado por cookie nas próprias rotas.

const TAKE = 50;

export async function clienteIdPorTelefone(tel: string): Promise<string | null> {
  const digitos = telefoneNumeros(tel);
  if (digitos.length < 10) return null;
  const cli = await prisma.client.findUnique({
    where: { telefone: digitos },
    select: { id: true },
  });
  return cli?.id ?? null;
}

export async function listarDoCliente(clienteId: string) {
  const [itens, naoLidas] = await Promise.all([
    prisma.notification.findMany({
      where: { clienteId, audiencia: "cliente" },
      orderBy: [{ fixada: "desc" }, { criadoEm: "desc" }],
      take: TAKE,
    }),
    prisma.notification.count({
      where: { clienteId, audiencia: "cliente", lida: false },
    }),
  ]);
  return { itens, naoLidas };
}

export async function listarDoAdmin() {
  const [itens, naoLidas] = await Promise.all([
    prisma.notification.findMany({
      where: { audiencia: "admin" },
      orderBy: [{ fixada: "desc" }, { criadoEm: "desc" }],
      take: TAKE,
    }),
    prisma.notification.count({ where: { audiencia: "admin", lida: false } }),
  ]);
  return { itens, naoLidas };
}
