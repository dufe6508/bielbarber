// Ativa push no navegador do cliente e registra a assinatura no backend.
// Chamado silenciosamente após confirmar um agendamento — sem bloquear o fluxo.

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function base64ParaUint8(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// telefone = só dígitos. Não lança: qualquer falha é silenciosa (best-effort).
export async function ativarPush(telefone: string): Promise<void> {
  try {
    if (
      !VAPID_PUBLIC ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return;
    }

    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") return;

    const reg = await navigator.serviceWorker.ready;
    const existente = await reg.pushManager.getSubscription();
    const sub =
      existente ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ParaUint8(VAPID_PUBLIC) as BufferSource,
      }));

    const json = sub.toJSON();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telefone,
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        userAgent: navigator.userAgent,
      }),
    });
  } catch {
    // best-effort: ignora falhas de push
  }
}
