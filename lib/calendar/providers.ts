import type { CalendarEvent, CalendarProvider, CalendarTarget, SyncResult } from "./types";
import { prisma } from "@/lib/prisma";

// ─── Utilitários OAuth Google ────────────────────────────────────────────────

const CHAVE_REFRESH_TOKEN = "google_calendar_refresh_token";
const CHAVE_CALENDAR_ID = "google_calendar_id";

// Obtém um access_token válido a partir do refresh_token salvo no banco.
// Retorna null se não houver token ou se a troca falhar.
async function getAccessToken(): Promise<string | null> {
  const tokenRow = await prisma.setting
    .findUnique({ where: { chave: CHAVE_REFRESH_TOKEN } })
    .catch(() => null);

  if (!tokenRow?.valor) return null;

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokenRow.valor,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    console.error("[google-calendar] falha ao renovar access_token:", await res.text());
    return null;
  }

  const data = await res.json();
  return data.access_token ?? null;
}

// Obtém o calendarId configurado (padrão: "primary").
async function getCalendarId(): Promise<string> {
  const row = await prisma.setting
    .findUnique({ where: { chave: CHAVE_CALENDAR_ID } })
    .catch(() => null);
  return row?.valor ?? "primary";
}

// "YYYY-MM-DD" + "HH:MM" → "YYYY-MM-DDTHH:MM:00" (sem timezone — barbearia só tem um fuso).
function toRFC3339Local(data: string, hora: string): string {
  return `${data}T${hora}:00`;
}

// ─── Registro de providers de agenda ────────────────────────────────────────

function naoConfigurado(id: string): SyncResult {
  return { provider: id, ok: false, motivo: "nao_configurado" };
}

// Google Calendar (API) — ativa quando há refresh_token no banco E as credenciais OAuth
// estão no ambiente. O barbeiro autoriza uma vez pelo painel (/admin/configuracoes).
const google: CalendarProvider = {
  id: "google",
  nome: "Google Calendar",
  habilitado() {
    return Boolean(
      process.env.GOOGLE_CALENDAR_CLIENT_ID && process.env.GOOGLE_CALENDAR_CLIENT_SECRET
    );
    // A verificação do refresh_token no banco é async — o check de env é suficiente
    // para o filtro síncrono de providersHabilitados(). Se o token não existir,
    // sincronizar() retornará nao_configurado em tempo de execução.
  },
  async sincronizar(evento: CalendarEvent, alvo: CalendarTarget): Promise<SyncResult> {
    // Só sincroniza para o admin — cliente não tem e-mail.
    if (alvo !== "admin") {
      return { provider: this.id, ok: false, motivo: "alvo_nao_suportado" };
    }

    const accessToken = await getAccessToken();
    if (!accessToken) return naoConfigurado(this.id);

    const calendarId = await getCalendarId();

    // Monta o evento no formato da Google Calendar Events API.
    const body = {
      summary: evento.titulo,
      description: evento.descricao,
      // location omitido quando vazio — evento sem endereço.
      ...(evento.local ? { location: evento.local } : {}),
      start: {
        dateTime: toRFC3339Local(evento.inicio.data, evento.inicio.hora),
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: toRFC3339Local(evento.fim.data, evento.fim.hora),
        timeZone: "America/Sao_Paulo",
      },
      // UID estável: permite atualizar/cancelar o evento pelo mesmo ID depois.
      id: evento.uid.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 1024),
    };

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

    // Tenta inserir; se o evento já existir (409), faz update (PUT).
    let res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 409) {
      // Evento já existe — atualiza.
      res = await fetch(
        `${url}/${encodeURIComponent(body.id)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error("[google-calendar] falha ao criar/atualizar evento:", errText);
      return { provider: this.id, ok: false, motivo: `google_api_${res.status}` };
    }

    const data = await res.json();
    return {
      provider: this.id,
      ok: true,
      externalId: data.id,
      url: data.htmlLink,
    };
  },
};

// Apple Calendar (CalDAV) — reservado para futuro. Não tem sync de servidor ainda.
const apple: CalendarProvider = {
  id: "apple",
  nome: "Apple Calendar",
  habilitado() {
    return Boolean(process.env.APPLE_CALDAV_URL && process.env.APPLE_CALDAV_TOKEN);
  },
  async sincronizar(_evento: CalendarEvent, _alvo: CalendarTarget): Promise<SyncResult> {
    return naoConfigurado(this.id);
  },
};

// Agenda do dispositivo — coberta pelo caminho local (ICS / link), entregue na UI.
// Não tem sync de servidor. Mantido aqui para documentar o alvo.
const dispositivo: CalendarProvider = {
  id: "dispositivo",
  nome: "Agenda do dispositivo",
  habilitado() {
    return false;
  },
  async sincronizar(_evento: CalendarEvent, _alvo: CalendarTarget): Promise<SyncResult> {
    return naoConfigurado(this.id);
  },
};

export const PROVIDERS: CalendarProvider[] = [google, apple, dispositivo];

export function providersHabilitados(): CalendarProvider[] {
  return PROVIDERS.filter((p) => p.habilitado());
}
