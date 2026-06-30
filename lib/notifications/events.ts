// Catálogo de eventos de notificação — contrato estável consumido pelo dispatcher
// central (lib/notifications/notify.ts). Um evento pode gerar notificações para
// o cliente, para o admin, ou ambos (o mapeamento vive em catalog.ts).
export type NotificationEvent =
  // ─── Agenda (cliente + admin) ─────────────────────────────────────────────
  | { type: "agendamento_confirmado"; appointmentId: string }
  | { type: "agendamento_remarcado"; appointmentId: string }
  | { type: "agendamento_cancelado"; appointmentId: string; porCliente?: boolean }
  | { type: "lembrete_horario"; appointmentId: string; minutesBefore: number }
  | { type: "checkin_realizado"; appointmentId: string }
  | { type: "avaliacao_recebida"; appointmentId: string }
  | { type: "agenda_liberada"; ateData: string } // admin ampliou horizonte → broadcast cliente
  // ─── Pagamentos / cobrança ────────────────────────────────────────────────
  | { type: "cobranca_emitida"; chargeId: string; valor: number }
  | { type: "cobranca_lembrete"; chargeId: string; valor: number; vencido: boolean }
  | { type: "cobranca_confirmada"; chargeId: string; valor: number }
  | { type: "pagamento_recebido"; tipo: "pedido" | "agendamento"; valor: number; clienteNome?: string }
  // ─── Assinaturas / mensalistas ────────────────────────────────────────────
  | { type: "assinatura_vencendo"; subscriptionId: string; daysLeft: number }
  // ─── Pacotes ──────────────────────────────────────────────────────────────
  | { type: "pacote_vencendo"; clientePacoteId: string; daysLeft: number }
  | { type: "pacote_saldo_baixo"; clientePacoteId: string; restantes: number }
  | { type: "pacote_encerrado"; clientePacoteId: string }
  | { type: "pacote_expirado"; clientePacoteId: string }
  // ─── Loja ─────────────────────────────────────────────────────────────────
  | { type: "estoque_novo"; productId: string; slug: string }
  | { type: "estoque_baixo"; productId: string }
  | { type: "pedido_pronto"; orderId: string }
  // ─── Fidelidade / promoções ───────────────────────────────────────────────
  | { type: "fidelidade_carimbo"; clienteId: string; carimbos: number; faltam: number }
  | { type: "promocao"; message: string; deepLink?: string }
  // ─── Sistema ──────────────────────────────────────────────────────────────
  | { type: "bloqueio_acesso"; clienteId: string; motivo?: string }
  | { type: "desbloqueio_acesso"; clienteId: string }
  | { type: "waitlist_horario_livre"; date: string; clienteId: string }
  // Mensagem livre do admin para um cliente (motor do broadcast).
  | { type: "mensagem_admin"; clienteId: string; titulo: string; mensagem: string; deepLink?: string }
  // ─── Resumos / gestão (somente admin) ─────────────────────────────────────
  | { type: "resumo_diario"; cortes: number; pendencias: number; faturamento: number }
  | { type: "meta_batida"; valor: number; meta: number }
  | { type: "baixa_ocupacao"; data: string; ocupacao: number };

// Flags de preferência do cliente que gateiam o push (NotificationPreference).
export type PrefFlag =
  | "confirmacao"
  | "lembrete"
  | "promocao"
  | "assinaturaVencendo"
  | "estoqueNovo"
  | "sistemaAtivo";
