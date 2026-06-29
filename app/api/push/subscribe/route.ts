import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST — registra (ou reativa) uma assinatura push do navegador do cliente.
// Body: { telefone, endpoint, p256dh, auth, userAgent? }
// Sem login: o cliente é resolvido pelo telefone (só dígitos).
export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  const telefone = String(b?.telefone ?? "").replace(/\D/g, "");
  const { endpoint, p256dh, auth, userAgent } = b ?? {};

  if (telefone.length < 10 || !endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const cliente = await prisma.client.findUnique({
    where: { telefone },
    select: { id: true },
  });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: String(endpoint) },
    update: {
      clienteId: cliente.id,
      p256dh: String(p256dh),
      auth: String(auth),
      userAgent: userAgent ? String(userAgent).slice(0, 240) : null,
      ativo: true,
    },
    create: {
      clienteId: cliente.id,
      endpoint: String(endpoint),
      p256dh: String(p256dh),
      auth: String(auth),
      userAgent: userAgent ? String(userAgent).slice(0, 240) : null,
    },
  });

  // Garante uma preferência padrão (campos têm default no schema).
  await prisma.notificationPreference.upsert({
    where: { clienteId: cliente.id },
    update: {},
    create: { clienteId: cliente.id },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
