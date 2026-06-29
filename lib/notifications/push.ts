import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import type { PrefFlag } from "./events";
import type { PushExtras } from "./catalog";

// Entrega de Web Push — UM canal do dispatcher (lib/notifications/notify.ts).
// VAPID — gere um par com `npx web-push generate-vapid-keys` e configure no .env.
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:contato@bielbarber.com";

let configurado = false;
function configurar(): boolean {
  if (configurado) return true;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  configurado = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url: string;
} & PushExtras;

// Hora atual cai dentro do silêncio (quiet hours) do cliente?
// Suporta intervalo que cruza a meia-noite (ex.: 22h → 8h).
function dentroSilencio(inicio: number | null, fim: number | null): boolean {
  if (inicio == null || fim == null) return false;
  const h = new Date().getHours();
  return inicio <= fim ? h >= inicio && h < fim : h >= inicio || h < fim;
}

// Envia push para todas as assinaturas ativas do admin. No-op se VAPID ausente.
export async function enviarPushParaAdmin(payload: PushPayload): Promise<void> {
  if (!configurar()) return;

  const assinaturas = await prisma.adminPushSubscription.findMany({
    where: { ativo: true },
  });
  if (assinaturas.length === 0) return;

  const corpo = JSON.stringify(payload);

  await Promise.all(
    assinaturas.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          corpo
        );
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await prisma.adminPushSubscription.update({
            where: { id: s.id },
            data: { ativo: false },
          });
        } else {
          console.error("[push:admin] falha ao enviar", s.endpoint, status);
        }
      }
    })
  );
}

// Envia push para todas as assinaturas ativas do cliente, respeitando a
// preferência do tipo (prefFlag) e o silêncio noturno. No-op se VAPID ausente.
export async function enviarPushParaCliente(
  clienteId: string,
  payload: PushPayload,
  prefFlag?: PrefFlag
): Promise<void> {
  if (!configurar()) {
    console.log("[push] VAPID ausente — pulando", clienteId);
    return;
  }

  const pref = await prisma.notificationPreference.findUnique({
    where: { clienteId },
  });
  if (pref) {
    if (!pref.pushAtivo) return;
    if (prefFlag && pref[prefFlag] === false) return;
    if (dentroSilencio(pref.quietInicio, pref.quietFim)) return;
  }

  const assinaturas = await prisma.pushSubscription.findMany({
    where: { clienteId, ativo: true },
  });
  if (assinaturas.length === 0) return;

  const corpo = JSON.stringify(payload);

  await Promise.all(
    assinaturas.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          corpo
        );
      } catch (err) {
        // 404/410 = assinatura morta → desativa.
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.update({
            where: { id: s.id },
            data: { ativo: false },
          });
        } else {
          console.error("[push] falha ao enviar", s.endpoint, status);
        }
      }
    })
  );
}
