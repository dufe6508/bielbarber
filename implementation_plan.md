# Roadmap de Produto — Biel Barber Shop (V4 — pendências)

> Atualizado jun/2026. Quase tudo do V4 implementado. Resta só o que depende de provedor externo.

---

## Implementado nesta rodada

- **Fila de espera (Waitlist) — completo.** `POST /api/waitlist`, CTA "Me avise se liberar" no `StepHorario` (dia cheio), e trigger no cancelamento (`PATCH /api/agendamentos/[id]`) que dispara push para quem está na fila daquela data.
- **Galeria por cliente (ClientPhoto) — completo.** Upload/listar (`/api/admin/clientes/[id]/fotos`) + remover (`/api/admin/clientes/fotos/[id]`) via Supabase Storage (bucket `clientes`), tab "Fotos" no perfil do cliente (`FotosClienteModal`). Galeria privada.
- **Push — envio real.** `lib/notifications/push.ts` envia via `web-push` respeitando `NotificationPreference`; SW com handlers `push`/`notificationclick`; subscribe no cliente após confirmar agendamento (`lib/notifications/subscribe-client.ts`); confirmação de agendamento dispara push. **Falta só configurar as VAPID keys** (`.env.example` já documenta — gerar com `npx web-push generate-vapid-keys`).

---

## Pendência restante

### 💬 WhatsApp automático
_Stub pronto em `lib/notifications/whatsapp.ts` (mesmo contrato de evento do push)._
Bloqueado em decisão de provedor (Meta Cloud API / Twilio / outro BSP) + número aprovado + token. Plugar o `POST` ao provedor quando definido. Lembretes de horário + cobrança de mensalista reusam os triggers já existentes.

---

## Configuração necessária para o push funcionar

1. `npx web-push generate-vapid-keys`
2. Preencher no `.env`: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
3. Garantir ícone `public/icon-192.png` (usado na notificação).

---

## Decisões pendentes com o barbeiro

- [ ] Meta do cartão fidelidade (quantos cortes p/ recompensa?)
- [ ] Recompensa do fidelidade (corte grátis? desconto fixo?)
- [ ] Política de no-show → liga com blacklist automática?
- [ ] Aniversário: desconto fixo ou percentual?
- [ ] Quais clientes já são mensalistas hoje (grupo dia 10 vs dia 30)?
- [ ] Quem pode pagar no local: só clientes que já pagaram antes? Manual pelo admin?
- [ ] Galeria: fotos reais do portfólio ou placeholders no início?
- [ ] Quais serviços vincular a quais categorias de galeria?
- [ ] WhatsApp: qual provedor/BSP?
