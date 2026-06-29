import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Flags booleanas editáveis pelo cliente.
const FLAGS = [
  "pushAtivo",
  "whatsappAtivo",
  "confirmacao",
  "lembrete",
  "promocao",
  "assinaturaVencendo",
  "estoqueNovo",
  "sistemaAtivo",
] as const;

async function clientePorTelefone(telefone: string) {
  if (telefone.length < 10) return null;
  return prisma.client.findUnique({ where: { telefone }, select: { id: true } });
}

// GET ?telefone= — devolve as preferências (cria padrão se não existir).
export async function GET(request: Request) {
  const telefone = (new URL(request.url).searchParams.get("telefone") ?? "").replace(/\D/g, "");
  const cliente = await clientePorTelefone(telefone);
  if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const prefs = await prisma.notificationPreference.upsert({
    where: { clienteId: cliente.id },
    update: {},
    create: { clienteId: cliente.id },
  });
  return NextResponse.json(prefs);
}

// PATCH { telefone, ...flags } — atualiza apenas as flags booleanas enviadas.
export async function PATCH(request: Request) {
  const b = await request.json().catch(() => null);
  const telefone = String(b?.telefone ?? "").replace(/\D/g, "");
  const cliente = await clientePorTelefone(telefone);
  if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const data: Record<string, boolean | number | null> = {};
  for (const f of FLAGS) {
    if (typeof b?.[f] === "boolean") data[f] = b[f];
  }
  // Quiet hours (0-23) ou null para desligar.
  for (const q of ["quietInicio", "quietFim"] as const) {
    if (b?.[q] === null) data[q] = null;
    else if (typeof b?.[q] === "number" && b[q] >= 0 && b[q] <= 23) data[q] = b[q];
  }

  const prefs = await prisma.notificationPreference.upsert({
    where: { clienteId: cliente.id },
    update: data,
    create: { clienteId: cliente.id, ...data },
  });
  return NextResponse.json(prefs);
}
