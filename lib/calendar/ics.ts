import type { CalendarEvent } from "./types";

// Geração de ICS (RFC 5545) a partir de um CalendarEvent — caminho que funciona
// hoje sem nenhuma API externa: o cliente/admin baixa o .ics e o sistema operacional
// abre direto na agenda nativa (Google Calendar no Android, Apple Calendar no iOS).

// Escapa vírgula, ponto-e-vírgula, barra e quebras de linha conforme o RFC.
function esc(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// "YYYY-MM-DD" + "HH:MM" → "YYYYMMDDTHHMMSS" (horário local flutuante).
function dt(data: string, hora: string): string {
  return `${data.replace(/-/g, "")}T${hora.replace(":", "")}00`;
}

// Quebra linhas longas em 75 octetos (folding do RFC 5545) — alguns apps exigem.
function dobrar(linha: string): string {
  if (linha.length <= 75) return linha;
  const partes: string[] = [];
  let resto = linha;
  partes.push(resto.slice(0, 75));
  resto = resto.slice(75);
  while (resto.length > 74) {
    partes.push(" " + resto.slice(0, 74));
    resto = resto.slice(74);
  }
  if (resto.length) partes.push(" " + resto);
  return partes.join("\r\n");
}

export function gerarICS(evento: CalendarEvent): string {
  const carimbo = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Biel Barber Shop//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${evento.uid}`,
    `DTSTAMP:${carimbo}`,
    `DTSTART:${dt(evento.inicio.data, evento.inicio.hora)}`,
    `DTEND:${dt(evento.fim.data, evento.fim.hora)}`,
    `SUMMARY:${esc(evento.titulo)}`,
    `DESCRIPTION:${esc(evento.descricao)}`,
    `LOCATION:${esc(evento.local)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return linhas.map(dobrar).join("\r\n");
}
