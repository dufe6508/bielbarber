import type { CalendarEvent } from "./types";

// Links de "adicionar à agenda" que funcionam hoje sem API — apenas abrem o app
// web do provedor com o evento pré-preenchido. Não criam evento via servidor
// (isso é papel dos providers de API, ainda desativados), mas cobrem o caso de
// uso real de hoje a partir do navegador.

// "YYYY-MM-DD"+"HH:MM" → "YYYYMMDDTHHMMSS" (horário local flutuante).
function dt(data: string, hora: string): string {
  return `${data.replace(/-/g, "")}T${hora.replace(":", "")}00`;
}

// Google Calendar — template de criação de evento (render?action=TEMPLATE).
export function linkGoogleAgenda(evento: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: evento.titulo,
    dates: `${dt(evento.inicio.data, evento.inicio.hora)}/${dt(evento.fim.data, evento.fim.hora)}`,
    details: evento.descricao,
  });
  if (evento.local) params.set("location", evento.local);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Outlook/Office 365 — deeplink de composição (caso o cliente use Outlook web).
export function linkOutlookAgenda(evento: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: evento.titulo,
    body: evento.descricao,
    startdt: `${evento.inicio.data}T${evento.inicio.hora}:00`,
    enddt: `${evento.fim.data}T${evento.fim.hora}:00`,
  });
  if (evento.local) params.set("location", evento.local);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
