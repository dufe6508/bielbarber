// Service worker mínimo. Sem cache offline (fora do escopo) — existe só para
// satisfazer o critério de instalabilidade do Chrome (precisa de um handler de
// fetch). ponytail: adicionar cache/offline aqui se for virar requisito.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

// ─── Push ───────────────────────────────────────────────────────────────────
// Payload enviado pelo servidor: { title, body, url }
self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { title: "Biel Barber", body: event.data ? event.data.text() : "" };
  }
  const title = dados.title || "Biel Barber Shop";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: dados.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: dados.url || "/" },
    })
  );
});

// Toque na notificação → foca uma aba existente ou abre a URL de destino.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || "/";
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
