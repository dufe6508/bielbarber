import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST — registra (ou reativa) assinatura push do navegador do admin.
// Body: { endpoint, p256dh, auth, userAgent? }
export async function POST(request: Request) {
  await requireAdmin();

  const b = await request.json().catch(() => null);
  const { endpoint, p256dh, auth, userAgent } = b ?? {};

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  await prisma.adminPushSubscription.upsert({
    where: { endpoint: String(endpoint) },
    update: {
      p256dh: String(p256dh),
      auth: String(auth),
      userAgent: userAgent ? String(userAgent).slice(0, 240) : null,
      ativo: true,
    },
    create: {
      endpoint: String(endpoint),
      p256dh: String(p256dh),
      auth: String(auth),
      userAgent: userAgent ? String(userAgent).slice(0, 240) : null,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
