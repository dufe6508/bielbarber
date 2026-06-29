import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  nome: z.string().min(2, "Informe seu nome"),
  telefone: z.string().min(10, "Telefone inválido"),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
});

// POST — cliente entra na fila de espera de um dia lotado.
// Idempotente: já estar na lista para a data retorna ok.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dados inválidos." },
      { status: 400 }
    );
  }
  const { nome, telefone, data } = parsed.data;

  const cliente = await prisma.client.upsert({
    where: { telefone },
    update: { nome },
    create: { nome, telefone },
  });
  if (cliente.bloqueado) {
    return NextResponse.json({ error: "Não foi possível." }, { status: 403 });
  }

  await prisma.waitlist.upsert({
    where: { clienteId_data: { clienteId: cliente.id, data: new Date(data) } },
    update: {},
    create: { clienteId: cliente.id, data: new Date(data) },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
