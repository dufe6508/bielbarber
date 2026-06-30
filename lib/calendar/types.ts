// ─── Contrato de integração com agendas ─────────────────────────────────────
// Camada de arquitetura preparada para sincronizar agendamentos com agendas
// nativas (Google Calendar, Apple Calendar, agenda do dispositivo). Nesta fase
// só o caminho local (ICS / link de calendário) está ativo — integrações via API
// (OAuth Google, CalDAV Apple) entram depois implementando `CalendarProvider`,
// sem alterar quem chama o dispatcher.

// Para quem o evento é criado: agenda do barbeiro ou agenda do cliente.
export type CalendarTarget = "admin" | "cliente";

// Evento de calendário neutro de provedor — a fonte única que cada provider
// traduz para o seu formato (ICS, Google Events API, CalDAV, etc.).
export type CalendarEvent = {
  // Identidade estável (deriva do agendamento) — usada como UID para permitir
  // atualização/cancelamento idempotente no futuro.
  uid: string;
  titulo: string;
  descricao: string;
  local: string;
  // Horário local "flutuante" (sem timezone) — a barbearia opera num fuso só.
  inicio: { data: string; hora: string }; // data: YYYY-MM-DD, hora: HH:MM
  fim: { data: string; hora: string };
  // Dados de contato para futuros providers (convidar cliente por e-mail, etc.).
  cliente?: { nome: string; telefone: string };
};

// Resultado da tentativa de sincronizar um evento num provider.
export type SyncResult = {
  provider: string;
  ok: boolean;
  // Quando ok: id externo do evento (para update/delete futuros) ou link.
  externalId?: string;
  url?: string;
  // Quando não ok: motivo legível (ex.: "nao_configurado", "sem_credencial").
  motivo?: string;
};

// Contrato que todo provider de agenda implementa. Adicionar Google/Apple é só
// criar um arquivo novo que implemente isto e registrá-lo em `providers.ts`.
export type CalendarProvider = {
  id: string;
  nome: string;
  // Habilitado só quando há credencial/config — providers de API ficam off até lá.
  habilitado(): boolean;
  // Cria (ou atualiza) o evento na agenda do alvo. Best-effort: nunca lança.
  sincronizar(evento: CalendarEvent, alvo: CalendarTarget): Promise<SyncResult>;
};
