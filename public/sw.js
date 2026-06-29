// Service worker mínimo. Sem cache offline (fora do escopo) — existe só para
// satisfazer o critério de instalabilidade do Chrome (precisa de um handler de
// fetch). ponytail: adicionar cache/offline aqui se for virar requisito.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

// ─── Push ───────────────────────────────────────────────────────────────────
// Payload do servidor: { title, body, url, tag?, actions?, requireInteraction? }
self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { title: "Biel Barber", body: event.data ? event.data.text() : "" };
  }
  const title = dados.title || "Biel Barber Shop";
  const acoes = Array.isArray(dados.actions) && dados.actions.length > 0
    ? dados.actions.slice(0, 2)
    : [{ action: "abrir", title: "Abrir app" }];
  const opts = {
    body: dados.body || "",
    icon: dados.icon || "/biel-logo.png",
    badge: "/biel-logo.png",
    tag: dados.tag || undefined,
    renotify: Boolean(dados.tag),
    requireInteraction: Boolean(dados.requireInteraction),
    vibrate: [60, 40, 60],
    actions: acoes,
    data: { url: dados.url || "/" },
  };
  if (dados.image) opts.image = dados.image;
  event.waitUntil(self.registration.showNotification(title, opts));
});

// Toque na notificação (ou num botão de ação) → abre/foca a URL de destino.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // A ação "pagar" sempre leva à área de mensalidade; senão usa a url do payload.
  const destino =
    event.action === "pagar"
      ? "/mensalista"
      : (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((abas) => {
      for (const aba of abas) {
        if ("focus" in aba) {
          aba.navigate(destino);
          return aba.focus();
        }
      }
      return self.clients.openWindow(destino);
    })
  );
});
