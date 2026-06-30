# 🔐 SECURITY_AUDIT.md
> **Stack:** Next.js · Supabase · Vercel · Mercado Pago  
> **Quando usar:** Execute este documento antes de qualquer deploy em produção.  
> **Como usar:** Cole na raiz do projeto e diga ao Claude: *"Execute o SECURITY_AUDIT.md no meu projeto"*

---

## ✅ SEÇÕES CONCLUÍDAS

### Seção 1 — Autenticação & Autorização ✅ (1 fix aplicado)
- Todas as rotas `/api/admin/*` verificam `getAdminSession()` ✅
- Cookie: `httpOnly`, `secure` em prod, `sameSite=lax` ✅
- Senha: scrypt + salt aleatório + `timingSafeEqual` ✅
- Logout limpa cookie server-side ✅
- **Fix aplicado:** `lib/auth.ts:70` — removido fallback `|| "biel"`; lança erro em produção se senha não configurada

### Seção 2 — IDOR / BOLA ✅ (2 fixes aplicados)
- **Fix aplicado:** `GET /api/agendamentos` — removido `include: { cliente }`, resposta não expõe mais PII
- **Fix aplicado:** `PATCH /api/agendamentos/[id]` — adicionada verificação de `telefone` no body para cancelar/remarcar/avaliar/checkin

### Seção 3 — Validação de Inputs & Sanitização ✅ (2 fixes aplicados)
- POST `/api/agendamentos`: Zod completo ✅
- Admin PATCH clientes: whitelist manual explícita ✅
- Sem `dangerouslySetInnerHTML` em todo o código ✅
- **Fix aplicado:** upload `app/api/admin/produtos/upload/route.ts` — SVG bloqueado, magic bytes verificados
- **Fix aplicado:** `PATCH /api/agendamentos/[id]` — migrado de `as Body` para `z.discriminatedUnion` com Zod

### Seção 5 — Webhooks & Integridade de Pagamento 🟡 (pendência de go-live)
- HMAC + `timingSafeEqual` ✅
- Re-consulta API do MP antes de escrever ✅
- Retorna 200 em todos os paths ✅
- **Pendente go-live:** definir `MP_WEBHOOK_SECRET` — sem ele qualquer POST é aceito (`webhook/route.ts:16`)
- **Pendente go-live:** idempotência atômica — `charge.status !== "pago"` tem race condition; adicionar unique constraint em `mpPaymentId` na migration



### Seção 6 — Lógica de Negócio & Race Conditions ✅ (1 fix aplicado)
- Preço calculado server-side via DB ✅ (nunca vem do cliente)
- Bloqueio de cliente e cobrança pendente verificados dentro da transaction ✅
- **Fix aplicado:** `app/api/agendamentos/route.ts` — re-check de slot adicionado DENTRO da `$transaction` com `isolationLevel: Serializable`; erro atômico lançado se slot ocupado entre a checagem prévia e o INSERT

### Seção 7 — Mass Assignment / Over-Posting ✅ LIMPO
- `PATCH /api/admin/clientes/[id]` — whitelist manual com type guards (`typeof b.bloqueado === "boolean"`) ✅
- `PATCH /api/admin/servicos/[id]` — whitelist explícita campo a campo ✅
- `PATCH /api/admin/produtos/[id]` — whitelist explícita campo a campo ✅
- `PATCH /api/admin/agendamentos/[id]` — só `status` e `statusPagamento` via allowlist de enum ✅
- Nenhuma rota faz `update(body)` sem whitelist

### Seção 8 — CSRF ✅ LIMPO
- Cookie admin usa `sameSite: "lax"` — cross-site POST não envia o cookie automaticamente ✅
- Todas as rotas de mutação protegidas por auth cookie (session check) ✅
- Nenhum endpoint GET com efeito colateral ✅

### Seção 9 — Supabase / Banco de Dados ✅ LIMPO
- SQL `pg_tables WHERE rowsecurity = false` retornou `[]` — RLS habilitado em todas as tabelas ✅
- App usa só Prisma + service_role_key (service_role bypassa RLS por design) ✅
- `getSupabaseAdmin()` importada apenas em API routes server-side ✅

### Seção 11 — Rate Limiting ✅ (1 fix aplicado)
- **Fix aplicado:** `app/api/admin/login/route.ts` — rate limiter por IP: máx 5 tentativas / 15 min; retorna 429; contador zerado no login bem-sucedido
- Nota: limiter é in-process (não persiste entre cold starts). Suficiente para MVP; usar Upstash Redis se o volume justificar

### Seção 4 — Exposição de Dados Sensíveis ✅ LIMPO
- `SUPABASE_SERVICE_ROLE_KEY` apenas em `lib/supabase.ts`, importada só por API routes
- Nenhum arquivo `'use client'` importa o módulo supabase
- Sem secrets hardcoded no código
- `.env*` coberto pelo `.gitignore`

### Seção 10 — Obfuscação de IDs ✅ LIMPO
- Todos os modelos Prisma usam `@id @default(uuid())` — nenhum ID sequencial exposto via API

### Seção 12 — Headers de Segurança 🟡 PENDENTE CORREÇÃO
- X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy: presentes ✅
- **Content-Security-Policy: ausente** — adicionar em `next.config.ts`:
  ```ts
  { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https: wss:;" }
  ```

### Seção 13 — Secrets no Histórico do Git ✅ LIMPO
- `.gitignore` cobre `.env*` corretamente
- Nenhum arquivo `.env` encontrado no histórico git
- Nenhum padrão de secret (tokens JWT, APP_USR-, service_role) no histórico

### Seção 16 — Dependências & Supply Chain 🟡 MODERADO
- **0 críticas · 0 altas · 5 moderadas**
- `postcss < 8.5.10` (transitiva via `next`) — XSS em CSS stringify; fix exige downgrade breaking
- `@hono/node-server < 1.19.13` (transitiva via `prisma` dev) — apenas dev, sem impacto em produção
- `package-lock.json` commitado ✅
- Ação: monitorar releases do Next.js para fix automático

### Seção 14 — Audit Log 🟢 BAIXO (sem fix necessário para MVP)
- Nenhum audit log implementado — nenhuma tabela, nenhum middleware de logging
- **Não bloqueia deploy:** sistema tem 1 único admin (o próprio barbeiro), sem staff, sem bulk delete, sem operações multi-usuário
- Quando adicionar: se sistema ganhar múltiplos funcionários ou operações críticas em lote
- Ação pós-MVP: logar logins falhos (já tem rate limit), ações admin destrutivas (DELETE de clientes) e troca de senha

### Seção 15 — LGPD & Dados Pessoais 🟡 MÉDIO (sem fix de código, mas obrigações legais)
- **Dados coletados:** somente `nome` + `telefone` — mínimos necessários para o serviço ✅
- **CPF: não coletado** — elimina risco de dados sensíveis financeiros ✅
- **Sem política de privacidade** — gap legal: obrigatória pela LGPD antes de operar comercialmente
- **Sem fluxo de exclusão** — direito ao esquecimento (Art. 18 LGPD): cliente não consegue solicitar exclusão dos dados
- **Menores de idade:** público-alvo inclui 14-17 anos; LGPD Art. 14 exige consentimento do responsável — não implementado
- **Retenção:** dados de agendamentos têm relevância fiscal (5 anos); não documentado
- **Ação antes do lançamento comercial:** criar página de política de privacidade + endpoint admin para deletar dados de cliente (`DELETE /api/admin/clientes/[id]`)

### Seção 17 — Infraestrutura, DNS & Monitoramento 🟡 MÉDIO (verificação manual necessária)
- **`NEXT_PUBLIC_*` vars:** todas by-design — `SUPABASE_ANON_KEY` (protegida por RLS), `VAPID_PUBLIC_KEY`, `MP_PUBLIC_KEY`, `APP_URL` são projetadas para ser públicas ✅
- **Secrets sensíveis sem prefixo `NEXT_PUBLIC_`:** `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `VAPID_PRIVATE_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `CRON_SECRET` ✅
- **`.gitignore` cobre `.env*`** ✅
- **Sem Sentry/monitoramento de erros em runtime** — adicionar antes de lançamento; sem alertas de erro em produção
- **Preview deployments:** ⚠️ verificar no dashboard Vercel se as preview branches usam env vars separadas (não o banco de produção) — não verificável via código
- **Staging separado:** não existe — único ambiente de banco (Supabase free tier); aceitável para MVP mas risco se preview deployments apontarem para prod DB
- **Ação imediata:** no dashboard Vercel, garantir que Preview Deployments tenham `DATABASE_URL` apontando para branch/projeto Supabase separado (ou desabilitar previews)

---

## INSTRUÇÕES PARA O CLAUDE

Para cada problema encontrado:
1. Identifique o arquivo, função ou trecho exato
2. Classifique a severidade: 🔴 Crítico / 🟠 Alto / 🟡 Médio / 🟢 Baixo
3. Explique o risco e como poderia ser explorado
4. Mostre o código corrigido
5. Ao final de cada seção, gere um checklist com o status de cada item

---

## SEÇÃO 1 — Autenticação & Autorização

Audite:
- Todas as rotas protegidas possuem middleware de autenticação?
- Existe verificação de autorização por recurso (não só por papel/role)?
- Tokens JWT estão sendo validados corretamente (assinatura, expiração, issuer)?
- Refresh tokens com rotação implementada?
- Logout invalida o token no servidor (não só limpa cookie no cliente)?
- Sessões com tempo de expiração adequado?
- Fluxo de reset de senha seguro (token de uso único, expiração curta)?
- Contas administrativas têm MFA habilitado?

**Checklist da seção:**
- [ ] `middleware.ts` na raiz protege todas as rotas autenticadas
- [ ] Server Actions verificam `getServerSession()` ou `auth()` antes de qualquer operação
- [ ] Nenhuma rota sensível depende apenas de verificação client-side
- [ ] Logout invalida a sessão no servidor
- [ ] MFA habilitado para contas admin/operador

---

## SEÇÃO 2 — IDOR / BOLA (Acesso Indevido a Recursos)

Mapeie todos os endpoints, Server Actions e route handlers que recebem IDs como parâmetro (`/api/users/:id`, `/api/orders/:id`, `/api/posts/:id`, etc.).

Para cada um, verifique:
- A query busca o recurso usando **apenas o ID** sem validar o dono?
- Existe verificação de `resource_id + auth_user_id` (ownership)?
- Acesso negado retorna 403 Forbidden (não 404)?

**Padrão inseguro (sinalizar como 🔴 Crítico):**
```typescript
// ❌ Qualquer usuário autenticado acessa qualquer registro
const { data } = await supabase.from('orders').select('*').eq('id', orderId)
```

**Padrão seguro (referência):**
```typescript
// ✅ Sempre filtrar pelo user_id junto
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('id', orderId)
  .eq('user_id', session.user.id)

if (!data) return new Response('Forbidden', { status: 403 })
```

**Ações:**
1. Listar todos os endpoints com parâmetros de ID encontrados
2. Para cada um: status ✅ protegido ou 🔴 vulnerável
3. Sugerir correção para os vulneráveis
4. Verificar se existe middleware de autorização centralizado

---

## SEÇÃO 3 — Validação de Inputs & Sanitização

Audite:
- Inputs de formulários e APIs validados com schema (Zod, Joi, Yup)?
- Validação existe no **backend** (não só no frontend)?
- Parâmetros de query e URL validados antes de usar no banco?
- Uploads de arquivo com validação de tipo MIME, tamanho e extensão no servidor?
- SQL/NoSQL injection possível em alguma query dinâmica?
- XSS possível em dados renderizados sem escape?
- SVG aceito em upload? (SVG pode conter JavaScript — tratar como HTML, não como imagem)
- Open redirect via parâmetro `?redirect=` ou `?next=` sem validação da URL de destino?
- Email header injection nos templates de email transacional?

**XSS — Padrão inseguro (sinalizar como 🟠 Alto):**
```tsx
// ❌ Dado do banco renderizado como HTML sem sanitização
<div dangerouslySetInnerHTML={{ __html: post.content }} />

// ❌ Link construído com input do usuário sem validação de protocolo
<a href={user.website}>Site</a>
```

**XSS — Padrão seguro:**
```tsx
// ✅ Sanitizar antes de renderizar HTML
import DOMPurify from 'dompurify'
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} />

// ✅ Validar protocolo do link (javascript: é o vetor de ataque)
const safeUrl = /^https?:\/\//.test(url) ? url : '#'
<a href={safeUrl}>Site</a>
```

**Open redirect — Padrão inseguro (sinalizar como 🟡 Médio):**
```typescript
// ❌ Redireciona para qualquer URL vinda do cliente
const next = searchParams.get('redirect')
redirect(next) // atacante pode redirecionar para phishing
```

**Open redirect — Padrão seguro:**
```typescript
// ✅ Validar que o redirect é uma rota interna
const next = searchParams.get('redirect') ?? '/dashboard'
const safeRedirect = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
redirect(safeRedirect)
```

**SVG em upload — verificar:**
```typescript
// ❌ Validar apenas extensão ou Content-Type do cliente não é suficiente
// SVG com <script> é XSS, mesmo com MIME image/svg+xml

// ✅ Rejeitar SVG completamente em uploads de usuário, ou sanitizar com svgo + DOMPurify
// ✅ Servir arquivos de usuário sempre de subdomínio ou storage separado (não mesmo origin)
```

**Checklist da seção:**
- [ ] Toda API Route e Server Action valida o body com schema Zod
- [ ] Parâmetros de rota (`params.id`) são validados antes de usar no banco
- [ ] Uploads verificam tipo MIME **no servidor** (não só no cliente)
- [ ] SVG bloqueado em uploads ou sanitizado antes de salvar
- [ ] Nenhum template string SQL manual
- [ ] Todos os usos de `dangerouslySetInnerHTML` auditados e com DOMPurify
- [ ] Parâmetros `?redirect=` / `?next=` validados para URLs internas apenas
- [ ] Templates de email não interpolam input do usuário em headers (From, To, Subject)

---

## SEÇÃO 5 — Webhooks & Integridade de Pagamento (Mercado Pago)

> Esta seção é 🔴 crítica para qualquer sistema de ingressos/ticketing. Nunca confiar no cliente para confirmar um pagamento.

### 5.1 — Validação de Assinatura do Webhook

O Mercado Pago envia um header `x-signature` em cada webhook. Sem validar esse header, qualquer atacante pode enviar um POST falso para sua rota de webhook e liberar ingressos sem pagar.

**Padrão inseguro (sinalizar como 🔴 Crítico):**
```typescript
// ❌ Aceita qualquer POST sem verificar a origem
export async function POST(req: Request) {
  const body = await req.json()
  if (body.type === 'payment' && body.data.id) {
    await liberarIngresso(body.data.id) // NUNCA FAZER ISSO
  }
}
```

**Padrão seguro (referência):**
```typescript
// ✅ Validar assinatura HMAC antes de qualquer ação
export async function POST(req: Request) {
  const xSignature = req.headers.get('x-signature')
  const xRequestId = req.headers.get('x-request-id')
  const rawBody = await req.text()

  // Montar o manifest conforme documentação do MP
  const urlParams = new URL(req.url).searchParams
  const dataId = urlParams.get('data.id') ?? ''
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${xSignature?.split(',')[0]?.split('=')[1]};`

  const [tsPart, v1Part] = xSignature?.split(',') ?? []
  const ts = tsPart?.split('=')[1]
  const v1 = v1Part?.split('=')[1]

  const secret = process.env.MP_WEBHOOK_SECRET!
  const hmac = createHmac('sha256', secret).update(manifest).digest('hex')

  if (hmac !== v1) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Só depois de validar: processar o evento
  const body = JSON.parse(rawBody)
  // ...
}
```

### 5.2 — Nunca Confiar no Status/Valor Vindo do Cliente ou do Webhook

O webhook informa que houve um evento — não confirma o status final. Sempre reconsultar a API do MP pelo `payment_id`.

**Padrão inseguro (sinalizar como 🔴 Crítico):**
```typescript
// ❌ Confia no status que veio no webhook sem reconsultar
const { status, transaction_amount } = req.body
if (status === 'approved') {
  await liberarIngresso(userId, eventoId)
}
```

**Padrão seguro (referência):**
```typescript
// ✅ Sempre reconsultar o pagamento via API do MP pelo ID
const paymentId = body.data.id
const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! })
const payment = await new Payment(mp).get({ id: paymentId })

if (
  payment.status === 'approved' &&
  payment.transaction_amount === valorEsperado &&
  payment.external_reference === `${userId}:${eventoId}`
) {
  await liberarIngresso(userId, eventoId)
}
```

### 5.3 — Idempotência (Reenvio de Webhooks)

O Mercado Pago reenvia o mesmo evento várias vezes até receber HTTP 200. Sem idempotência, o mesmo pagamento pode liberar ingressos múltiplas vezes.

**Padrão seguro (referência):**
```typescript
// ✅ Registrar eventos processados e ignorar duplicatas
const existing = await supabase
  .from('webhook_events')
  .select('id')
  .eq('payment_id', paymentId)
  .single()

if (existing.data) {
  return new Response('Already processed', { status: 200 }) // retornar 200 para o MP parar de reenviar
}

// Processar e registrar atomicamente
await supabase.from('webhook_events').insert({ payment_id: paymentId, processed_at: new Date() })
await liberarIngresso(userId, eventoId)
```

**Checklist da seção:**
- [ ] Rota de webhook valida header `x-signature` com HMAC-SHA256
- [ ] Rota de webhook reconsulta o pagamento via API do MP antes de liberar ingresso
- [ ] Verificação do `transaction_amount` para garantir valor correto foi pago
- [ ] `external_reference` vincula o pagamento ao usuário e evento corretos
- [ ] Idempotência implementada (tabela `webhook_events` ou equivalente)
- [ ] Rota de webhook retorna HTTP 200 mesmo em duplicatas (para o MP parar de reenviar)
- [ ] Nenhum endpoint aceita confirmação de pagamento vinda diretamente do frontend

---

---

---

## RELATÓRIO FINAL DE AUDITORIA

**Data:** 2026-06-29  
**Projeto:** Biel Barber Shop  
**Stack:** Next.js · Supabase · Prisma · Vercel · Mercado Pago

---

### Achados por Severidade

🔴 **Crítico (bloqueiam deploy): 0**

🟠 **Alto (corrigir urgente): 0**

🟡 **Médio (antes do lançamento comercial): 4**
- `MP_WEBHOOK_SECRET` não configurado → webhook aceita qualquer POST sem validar assinatura (go-live: definir no painel MP + Vercel env vars)
- `SubscriptionCharge.mpPaymentId` sem unique constraint → race condition de idempotência no webhook (go-live: adicionar migration)
- Preview deployments Vercel: verificar no dashboard se não apontam para banco de produção (não verificável via código)
- LGPD: sem política de privacidade + sem endpoint de exclusão de dados de cliente (obrigatório antes de operar comercialmente)

🟢 **Baixo (pós-MVP): 3**
- Audit log: nenhum logging de ações admin — adicionar quando sistema ganhar múltiplos funcionários
- Dependências: 5 vulnerabilidades moderadas (transitivas via `next` e `prisma`) — aguardar fix nas dependências pai
- Monitoramento: sem Sentry/error tracking em runtime — adicionar antes de lançamento

---

### Checklist Geral

- [x] Seção 1 — Autenticação & Autorização ✅ (fix: senha padrão `|| "biel"` removida)
- [x] Seção 2 — IDOR / BOLA ✅ (fixes: GET PII removido + PATCH ownership por telefone)
- [x] Seção 3 — Validação de Inputs & Sanitização ✅ (fixes: SVG bloqueado + magic bytes + Zod discriminatedUnion)
- [x] Seção 4 — Exposição de Dados Sensíveis ✅ LIMPO
- [x] Seção 5 — Webhooks & Integridade de Pagamento 🟡 (pendência go-live: `MP_WEBHOOK_SECRET` + unique `mpPaymentId`)
- [x] Seção 6 — Lógica de Negócio & Race Conditions ✅ (fix: slot re-check atômico dentro da `$transaction(Serializable)`)
- [x] Seção 7 — Mass Assignment / Over-Posting ✅ LIMPO
- [x] Seção 8 — CSRF ✅ LIMPO (`sameSite: "lax"` protege todas as rotas admin)
- [x] Seção 9 — Supabase / Banco de Dados ✅ LIMPO (RLS em 100% das tabelas confirmado via SQL)
- [x] Seção 10 — Obfuscação de IDs ✅ LIMPO (todos os models usam `uuid()`)
- [x] Seção 11 — Rate Limiting ✅ (fix: 5 tentativas/IP/15 min no login)
- [x] Seção 12 — Headers de Segurança ✅ (fix: CSP adicionado ao `next.config.ts`)
- [x] Seção 13 — Secrets no Histórico do Git ✅ LIMPO
- [x] Seção 14 — Audit Log 🟢 BAIXO (1 admin, sem staff — desnecessário para MVP)
- [x] Seção 15 — LGPD 🟡 (sem CPF coletado ✅; gap: política de privacidade + exclusão de dados)
- [x] Seção 16 — Dependências & Supply Chain 🟡 (5 moderadas transitivas, 0 críticas)
- [x] Seção 17 — Infraestrutura, DNS & Monitoramento 🟡 (verificar preview deployments no Vercel; adicionar Sentry)

---

### Próximos Passos (em ordem de prioridade)

**Antes do go-live com pagamentos reais:**
1. Definir `MP_WEBHOOK_SECRET` no painel Mercado Pago → copiar para Vercel env vars (`MP_WEBHOOK_SECRET`)
2. Criar migration com `@@unique([mpPaymentId])` em `SubscriptionCharge` para idempotência atômica no webhook
3. Verificar no dashboard Vercel: Preview Deployments → usar `DATABASE_URL` de projeto Supabase separado (ou desabilitar previews)

**Antes do lançamento comercial:**
4. Criar página `/privacidade` com política de privacidade (dados coletados: nome + telefone; parceiros: Mercado Pago; retenção: 5 anos fiscal)
5. Adicionar `DELETE /api/admin/clientes/[id]` com hard delete de dados pessoais do cliente (direito ao esquecimento LGPD)

**Pós-MVP:**
6. Adicionar Sentry (`@sentry/nextjs`) para captura de erros em produção
7. Audit log quando houver múltiplos funcionários

---

*Versão 3.0 — Next.js + Supabase + Vercel + Mercado Pago*