import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Desativa a assinatura push pelo endpoint (não apaga: mantém histórico).
// Aceita DELETE ou POST. Body: { endpoint }
async function desativar(request: Request) {
  const b = await request.json().catch(() => null);
  const endpoint = b?.endpoint;
  if (!endpoint || typeof endpoint !== "string") {
    return NextResponse.json({ error: "Endpoint obrigatório" }, { status: 400 });
  }
  await prisma.pushSubscription
    .updateMany({ where: { endpoint }, data: { ativo: false } })
    .catch(() => null);
  return NextResponse.json({ ok: true });
}

export const DELETE = desativar;
export const POST = desativar;
