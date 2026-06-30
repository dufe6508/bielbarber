import type { CalendarEvent, CalendarProvider, CalendarTarget, SyncResult } from "./types";

// ─── Registro de providers de agenda ────────────────────────────────────────
// Cada provider implementa `CalendarProvider`. Os de API (Google, Apple) chegam
// DESATIVADOS: ficam off enquanto não houver credencial no ambiente, então o
// dispatcher simplesmente os ignora. Quando for hora de integrar de verdade,
// basta preencher o `sincronizar` e fornecer as variáveis de ambiente — nenhum
// outro arquivo precisa mudar.

function naoConfigurado(id: string): SyncResult {
  return { provider: id, ok: false, motivo: "nao_configurado" };
}

// Google Calendar (API) — exigirá OAuth do barbeiro + (no futuro) e-mail do
// cliente para convite. Ativa quando GOOGLE_CALENDAR_CLIENT_ID/SECRET existirem.
const google: CalendarProvider = {
  id: "google",
  nome: "Google Calendar",
  habilitado() {
    return Boolean(
      process.env.GOOGLE_CALENDAR_CLIENT_ID && process.env.GOOGLE_CALENDAR_CLIENT_SECRET
    );
  },
  async sincronizar(_evento: CalendarEvent, _alvo: CalendarTarget) {
    // ponytail: criar evento via Google Calendar Events API (events.insert),
    // usando o refresh token do barbeiro (alvo "admin") e convidando o e-mail do
    // cliente (alvo "cliente"). Por ora, não configurado.
    return naoConfigurado(this.id);
  },
};

// Apple Calendar (CalDAV) — exigirá credencial de app no iCloud do barbeiro.
const apple: CalendarProvider = {
  id: "apple",
  nome: "Apple Calendar",
  habilitado() {
    return Boolean(process.env.APPLE_CALDAV_URL && process.env.APPLE_CALDAV_TOKEN);
  },
  async sincronizar(_evento: CalendarEvent, _alvo: CalendarTarget) {
    // ponytail: PUT do VEVENT no servidor CalDAV do iCloud. Por ora, não configurado.
    return naoConfigurado(this.id);
  },
};

// Agenda do dispositivo — coberta pelo caminho local (ICS / link), entregue na UI.
// Não tem sync de servidor: o usuário adiciona pelo botão "Adicionar à agenda".
// Mantido aqui para documentar o alvo; sempre "desabilitado" para o dispatcher.
const dispositivo: CalendarProvider = {
  id: "dispositivo",
  nome: "Agenda do dispositivo",
  habilitado() {
    return false; // tratado no cliente via ICS/links, não por sync de servidor
  },
  async sincronizar(_evento: CalendarEvent, _alvo: CalendarTarget) {
    return naoConfigurado(this.id);
  },
};

export const PROVIDERS: CalendarProvider[] = [google, apple, dispositivo];

// Providers prontos para sincronização automática agora (vazio nesta fase).
export function providersHabilitados(): CalendarProvider[] {
  return PROVIDERS.filter((p) => p.habilitado());
}
