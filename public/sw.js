// Service worker mínimo. Sem cache offline (fora do escopo) — existe só para
// satisfazer o critério de instalabilidade do Chrome (precisa de um handler de
// fetch). ponytail: adicionar cache/offline aqui se for virar requisito.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
