import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET ?telefone=xxx — últimas 50 notificações do cliente
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const telefone = searchParams.get("telefone")?.replace(/\D/g, "") ?? "";

  if (telefone.length < 10) {
    return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
  }

  const cliente = await prisma.client.findUnique({
    where: { telefone },
    select: { id: true },
  });
  if (!cliente) {
    return NextResponse.json({ notificacoes: [] });
  }

  const notificacoes = await prisma.notificationLog.findMany({
    where: { clienteId: cliente.id },
    orderBy: { enviadoEm: "desc" },
    take: 50,
    select: { id: true, tipo: true, conteudo: true, lida: true, enviadoEm: true },
  });

  return NextResponse.json({ notificacoes });
}

// PATCH ?telefone=xxx — marca todas como lidas
export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const telefone = searchParams.get("telefone")?.replace(/\D/g, "") ?? "";

  if (telefone.length < 10) {
    return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
  }

  const cliente = await prisma.client.findUnique({
    where: { telefone },
    select: { id: true },
  });
  if (!cliente) return NextResponse.json({ ok: true });

  await prisma.notificationLog.updateMany({
    where: { clienteId: cliente.id, lida: false },
    data: { lida: true },
  });

  return NextResponse.json({ ok: true });
}
