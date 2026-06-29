// Catálogo de eventos de notificação. Triggers reais ligados no Sprint 3.
// Mantém o contrato estável para push/whatsapp futuros.
export type NotificationEvent =
  | { type: "agendamento_confirmado"; appointmentId: string }
  | { type: "lembrete_horario"; appointmentId: string; minutesBefore: number }
  | { type: "promocao"; message: string; deepLink?: string }
  | { type: "assinatura_vencendo"; subscriptionId: string; daysLeft: number }
  | { type: "estoque_novo"; productId: string; slug: string }
  | { type: "waitlist_horario_livre"; date: string; clienteId: string }
  // ─── Cobrança de mensalidade ──────────────────────────────────────────────
  | { type: "cobranca_emitida"; chargeId: string; valor: number }
  | { type: "cobranca_lembrete"; chargeId: string; valor: number; vencido: boolean }
  | { type: "cobranca_confirmada"; chargeId: string; valor: number };

// Mapeia um evento para a flag de preferência que o controla.
// Cliente com a flag desligada não recebe aquele tipo.
export const EVENTO_PREFERENCIA: Record<
  NotificationEvent["type"],
  "confirmacao" | "lembrete" | "promocao" | "assinaturaVencendo" | "estoqueNovo"
> = {
  agendamento_confirmado: "confirmacao",
  lembrete_horario: "lembrete",
  promocao: "promocao",
  assinatura_vencendo: "assinaturaVencendo",
  estoque_novo: "estoqueNovo",
  waitlist_horario_livre: "lembrete",
  // Cobrança é informação financeira essencial → controlada junto à mensalidade.
  cobranca_emitida: "assinaturaVencendo",
  cobranca_lembrete: "assinaturaVencendo",
  cobranca_confirmada: "assinaturaVencendo",
};
