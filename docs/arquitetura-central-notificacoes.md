# Central de Notificações — Arquitetura

> Status: proposta (pré-implementação). Decisões core abaixo. Execução por fases na seção 9.

## 0. Princípio

Hoje existe `sendPushToClient` (push efêmero) + catálogo de eventos tipado (`lib/notifications/events.ts`). Não existe **inbox persistente**. O sino pede exatamente isso: histórico, lido/não-lido, categorias, prioridade — push é só **um canal de entrega**, não a central.

Refator central: **um ponto de entrada `notify(event)`** que faz fan-out para canais:
1. grava linha(s) `Notification` (a inbox — o sino lê daqui)
2. dispara push (cliente, respeitando preferência)
3. (futuro) e-mail / whatsapp — flags dormentes

```
evento de negócio ──> notify(event) ──> catálogo (event → notificações[])
                                          ├─> grava Notification (inbox)  ← sino lê
                                          ├─> sendPushToClient (push)
                                          └─> [futuro] email/whatsapp
```

## 1. Restrições descobertas (mandam na arquitetura)

| Restrição | Consequência |
|---|---|
| **Cliente sem login** — identidade = telefone em `localStorage:biel:telefone` | Inbox do cliente é buscada por telefone, sem sessão. Sem websocket → **polling** (react-query, já instalado). |
| **Admin = 1 usuário** (cookie HMAC, `lib/auth.ts`) | "role" do spec = só 2 audiências: `cliente` (por Client) e `admin` (singular). Sem multi-admin, sem `user_id` real pro admin. |
| Catálogo de eventos já tipado | Estende, não recria. Unifica o mapper de payload (hoje duplicado em `push.ts`). |
| `NotificationPreference` já existe (prefs do cliente) | Reusa + adiciona `sistema`/`promocao`(já tem)/`email`(dormente)/quietHours. |
| `NotificationLog` (whatsapp) já existe | É log de **entrega** (auditoria), concern separado. **Não mexer.** |
| Pontos de trigger já existem | agendamento create/cancel/remarca, billing, waitlist, webhook MP — só plugar `notify()`. |

## 2. Schema (Prisma) — novo

```prisma
enum NotificationAudience { cliente admin }
enum NotificationCategory { agenda pagamentos mensalistas assinaturas loja sistema promocoes }
enum NotificationPriority { baixa normal alta urgente }

model Notification {
  id         String   @id @default(uuid())
  audiencia  NotificationAudience
  clienteId  String?  @map("cliente_id")   // null = notificação do admin
  categoria  NotificationCategory
  tipo       String                          // chave do evento ("agendamento_confirmado")
  titulo     String
  mensagem   String
  prioridade NotificationPriority @default(normal)
  lida       Boolean  @default(false)
  fixada     Boolean  @default(false)        // "fixar importantes"
  actionUrl  String?  @map("action_url")
  metadata   Json?                           // { appointmentId, chargeId, ... }
  lidaEm     DateTime? @map("lida_em")
  criadoEm   DateTime @default(now()) @map("criado_em")

  cliente Client? @relation(fields: [clienteId], references: [id], onDelete: Cascade)

  @@index([audiencia, lida, criadoEm])
  @@index([clienteId, criadoEm])
  @@map("notificacoes")
}
```

`NotificationPreference` — adicionar:
```prisma
sistemaAtivo  Boolean @default(true)  @map("sistema_ativo")   // allow_system
emailAtivo    Boolean @default(false) @map("email_ativo")     // allow_email (dormente)
quietInicio   Int?    @map("quiet_inicio")  // hora 0-23, não notificar de noite (opcional)
quietFim      Int?    @map("quiet_fim")
```

## 3. Dispatcher central

`lib/notifications/catalog.ts` — **fonte única** event → `NotificationSpec[]`:
```ts
type NotificationSpec = {
  audiencia: "cliente" | "admin";
  clienteId?: string;            // resolvido pelo evento
  categoria: NotificationCategory;
  prioridade: NotificationPriority;
  titulo: string;
  mensagem: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  prefFlag?: keyof NotificationPreference; // null = sempre entrega (financeiro/sistema)
  push?: PushExtras;             // tag, actions, requireInteraction (já existe)
};
```
Um evento pode gerar **2 specs** (ex: `agendamento_confirmado` → cliente "confirmado" + admin "João agendou"). `push.ts` passa a consumir `catalog.ts` (remove duplicação do `montarPayload`).

`lib/notifications/notify.ts`:
```ts
export async function notify(event: NotificationEvent): Promise<void> {
  const specs = montarSpecs(event);          // catalog
  for (const s of specs) {
    await prisma.notification.create({ ... }); // inbox
    if (s.audiencia === "cliente" && s.clienteId)
      await sendPushToClient(s.clienteId, event); // push (já respeita pref)
  }
}
```

## 4. Mapa de eventos (spec + adições)

`+` = adição minha além do spec.

### Cliente
| Evento | Categoria | Prio | Trigger |
|---|---|---|---|
| `agenda_liberada` + | agenda | normal | admin amplia horizonte de agendamento |
| `agendamento_confirmado` (existe) | agenda | normal | POST agendamento |
| `agendamento_remarcado` + | agenda | alta | PATCH remarcar |
| `agendamento_cancelado` + | agenda | alta | PATCH cancelar |
| `lembrete_horario` (existe; 24h/2h/30min) | agenda | normal | cron |
| `cobranca_emitida`/`lembrete` (existe) = pgto pendente | pagamentos | alta | billing |
| `cobranca_confirmada` (existe) = pgto confirmado | pagamentos | normal | webhook/manual |
| `bloqueio_acesso` + | sistema | urgente | admin bloqueia |
| `assinatura_vencendo` (existe) / `assinatura_saldo` + | assinaturas | normal | cron |
| `pedido_pronto` + (retirar na loja) | loja | normal | order → pronto |
| `fidelidade_carimbo` + ("faltam 2 p/ brinde") | promocoes | baixa | corte concluído |
| `promocao` (existe) | promocoes | baixa | admin |
| `mensagem_admin` + (broadcast) | sistema | normal | admin envia |

### Admin
| Evento | Categoria | Prio | Trigger |
|---|---|---|---|
| `admin_novo_agendamento` + | agenda | normal | POST agendamento |
| `admin_cancelamento` + | agenda | normal | PATCH cancelar |
| `admin_remarcacao` + | agenda | normal | PATCH remarcar |
| `admin_checkin` + ("João chegou") | agenda | baixa | PATCH checkin |
| `admin_avaliacao` + ("João 5★") | sistema | baixa | PATCH avaliar |
| `admin_mensalidade_atrasada` + | mensalistas | alta | cron/billing |
| `admin_mensalidade_paga` + | mensalistas | normal | webhook/manual |
| `admin_novo_pagamento` + (loja/serviço) | pagamentos | normal | webhook MP |
| `admin_assinatura_vencendo` + | assinaturas | normal | cron |
| `admin_cliente_bloqueado` + | sistema | normal | admin bloqueia |
| `admin_estoque_baixo` + | loja | alta | order/produto cruza limiar |
| `admin_resumo_diario` + ("Hoje: 9 cortes") | sistema | baixa | cron 8h |
| `admin_meta_batida` + (gamificação) | sistema | baixa | virada de mês |
| `admin_baixa_ocupacao` + (gatilho promo) | agenda | baixa | cron |

### Adições minhas (justificativa)
1. **check-in / avaliação** → já temos `checkinEm` e `rating` no schema; vira sinal pro admin de graça.
2. **fidelidade** → campo `carimbos` já existe e hoje é invisível pro cliente; notificação dá vida ao programa.
3. **pedido pronto** → `OrderPickupStatus.pronto` já existe, fechar o loop da loja.
4. **resumo diário / meta / baixa ocupação** → transformam a central em ferramenta de gestão, não só alertas.
5. **aniversário** (campo `aniversario` existe) → lembrete admin + cupom cliente (fase 2).
6. **quiet hours** nas preferências → não acordar cliente 2h da manhã.

## 5. APIs

Cliente (sem sessão, por telefone):
- `GET  /api/notificacoes?telefone=...` → `{ itens, naoLidas }`
- `PATCH /api/notificacoes/[id]` → `{ lida }` ou `{ fixada }`
- `DELETE /api/notificacoes/[id]`
- `POST /api/notificacoes/marcar-todas` `{ telefone }`

Admin (cookie-gated):
- `GET  /api/admin/notificacoes` → audiência admin
- `PATCH /api/admin/notificacoes/[id]`, `DELETE`, `POST .../marcar-todas`
- `POST /api/admin/notificacoes/broadcast` `{ titulo, mensagem, categoria, actionUrl }` → cria 1 Notification por cliente ativo (+ push aos optados)

Polling: react-query `refetchInterval ~60s`. Sem websocket — volume baixo (1 barbeiro, ~12 cortes/dia). <!-- ponytail: polling; troca p/ SSE se volume crescer -->

## 6. UI

`components/NotificationBell.tsx` — sino + bolinha vermelha + badge contador. Prop `audiencia`.
- **Desktop**: dropdown (popover, primitives existentes).
- **Mobile**: bottom sheet / drawer.
- Item: ícone por categoria, título, mensagem, tempo relativo, ponto não-lido. Ações: marcar lida, fixar, deletar (swipe/long-press). Chips de filtro por categoria. "Marcar todas".

Montagem:
- Cliente: `TopBar` (mobile) + cluster fixo canto sup. direito (desktop) em `app/(cliente)/layout.tsx`.
- Admin: header do `AdminShell`.

Um componente, duas fontes de dado (audiência). Reusa `primitives.tsx` + lib de motion existente.

## 7. Preferências (UI)

- Cliente: toggles push/sistema/promoção/lembrete + quiet hours em `/meu-perfil` ou na própria gaveta do sino.
- Admin: toggles por categoria (quais eventos viram notificação).

## 8. Fluxo validado (exemplos ponta-a-ponta)

**Novo agendamento**: cliente confirma → `POST /api/agendamentos` cria Appointment → `notify({type:"agendamento_confirmado", appointmentId})` → catálogo gera 2 specs → grava Notification(cliente "confirmado", agenda) + Notification(admin "João agendou sexta 15h", agenda) → push ao cliente. Sino do cliente: badge +1. Sino do admin: badge +1.

**Cobrança**: cron fecha ciclo → `notify({type:"cobranca_emitida"})` → Notification(cliente, pagamentos, alta, actionUrl `/mensalista`) + push requireInteraction. Pagou (webhook MP) → `notify({type:"cobranca_confirmada"})` → cliente "pago" + `notify(admin_mensalidade_paga)`.

**Bloqueio**: admin marca `bloqueado` → `notify(bloqueio_acesso)` cliente (urgente) + `notify(admin_cliente_bloqueado)`. Cliente vê na central o motivo.

**Broadcast**: admin "Fechado segunda" → fan-out 1 Notification/cliente ativo. <!-- ponytail: linhas por cliente; se nº clientes explodir, vira 1 linha broadcast + tabela de recibos -->

## 9. Execução por fases

1. **Schema** — model `Notification` + enums; estende `NotificationPreference`; migration.
2. **Core** — `catalog.ts` (mapa unificado) + `notify.ts`; refatora `push.ts` p/ consumir catálogo.
3. **APIs** — rotas cliente + admin (list/patch/delete/markall/broadcast).
4. **UI** — `NotificationBell` + drawer/dropdown; monta nos 2 shells.
5. **Triggers** — pluga `notify()` nos pontos existentes (agendamento, billing, bloqueio, webhook, produtos).
6. **Cron** — lembretes 24/2/0.5h, resumo diário, varreduras estoque/meta/ocupação.
7. **Preferências UI** — toggles cliente + admin.

## 10. Decisões pendentes (do barbeiro)

- [ ] Cadência de lembrete default (24h+2h+30min pode ser barulhento — sugiro só 2h ON por padrão).
- [ ] Limiar de "estoque baixo" (sugiro ≤3 un., editável).
- [ ] E-mail: sem infra hoje → flag dormente, sem implementar nesta fase.
- [ ] Quiet hours default (sugiro 22h–8h).
