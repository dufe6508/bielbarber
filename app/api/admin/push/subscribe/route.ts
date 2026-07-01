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

  const ua = userAgent ? String(userAgent).slice(0, 240) : null;

  await prisma.adminPushSubscription.upsert({
    where: { endpoint: String(endpoint) },
    update: { p256dh: String(p256dh), auth: String(auth), userAgent: ua, ativo: true },
    create: { endpoint: String(endpoint), p256dh: String(p256dh), auth: String(auth), userAgent: ua },
  });

  // Dedupe por device: o mesmo aparelho pode gerar 2 inscrições distintas (aba
  // do Chrome e PWA instalado), o que fazia o admin receber a notificação em
  // duplicidade. Como o userAgent é idêntico entre os dois contextos, mantemos
  // ativa só a inscrição desta chamada (a mais recente) e desativamos as demais
  // do mesmo userAgent. Contextos com UA diferente (outro celular/desktop)
  // continuam ativos normalmente.
  if (ua) {
    await prisma.adminPushSubscription.updateMany({
      where: { userAgent: ua, endpoint: { not: String(endpoint) }, ativo: true },
      data: { ativo: false },
    });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
