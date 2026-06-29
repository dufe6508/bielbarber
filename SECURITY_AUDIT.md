# 🔐 SECURITY_AUDIT.md
> **Stack:** Next.js · Supabase · Vercel · Mercado Pago  
> **Quando usar:** Execute este documento antes de qualquer deploy em produção.  
> **Como usar:** Cole na raiz do projeto e diga ao Claude: *"Execute o SECURITY_AUDIT.md no meu projeto"*

---

## INSTRUÇÕES PARA O CLAUDE

Você é um **Auditor de Segurança Sênior (AppSec + Cloud)** com expertise em segurança de aplicações web, banco de dados, infraestrutura cloud, pagamentos e qualidade de código.

Execute **todas as 17 seções em ordem**, sem pular nenhuma. Para cada problema encontrado:

1. Identifique o arquivo, função ou trecho exato
2. Classifique a severidade: 🔴 Crítico / 🟠 Alto / 🟡 Médio / 🟢 Baixo
3. Explique o risco e como poderia ser explorado
4. Mostre o código corrigido
5. Ao final de cada seção, gere um checklist com o status de cada item

Ao terminar todas as seções, gere o **Relatório Final** no formato especificado no final deste documento.

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

## SEÇÃO 4 — Exposição de Dados Sensíveis

Audite:
- Respostas de API retornam campos desnecessários (senhas, tokens, dados de outros usuários)?
- Logs registram dados sensíveis (senha, token, CPF, cartão)?
- Secrets ou API keys hardcoded no código?
- Variáveis de ambiente expostas no bundle do frontend?
- Dados sensíveis salvos em localStorage ou sessionStorage?
- Stack trace ou mensagens de erro internas expostas em produção?

**Checklist da seção:**
- [ ] `SUPABASE_SERVICE_ROLE_KEY` → apenas server-side, nunca com prefixo `NEXT_PUBLIC_`
- [ ] `SUPABASE_ANON_KEY` → pode ser pública, mas confirmar que RLS está ativo
- [ ] Nenhuma chave de API (Mercado Pago, SendGrid, etc.) com prefixo `NEXT_PUBLIC_`
- [ ] Arquivo `.env.local` está no `.gitignore`
- [ ] Nenhum `console.log` expondo tokens ou dados sensíveis em produção
- [ ] Buscar por strings hardcoded: `APP_USR-`, `TEST-`, `service_role`, `eyJhbGci`
- [ ] Server Actions retornam mensagem genérica ao cliente em caso de erro
- [ ] CPF e dados pessoais não aparecem em logs de erro ou responses desnecessários

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

## SEÇÃO 6 — Lógica de Negócio & Race Conditions

> Especialmente crítico em sistemas de ticketing: dois compradores simultâneos não podem comprar o último ingresso.

### 6.1 — Race Condition em Estoque de Ingressos

**Padrão inseguro (sinalizar como 🔴 Crítico):**
```typescript
// ❌ Ler quantidade e depois decrementar — race condition clássica
const evento = await supabase.from('eventos').select('vagas').eq('id', eventoId).single()
if (evento.data.vagas > 0) {
  await supabase.from('eventos').update({ vagas: vagas - 1 }).eq('id', eventoId)
  await criarIngresso(userId, eventoId)
  // Entre o select e o update, outro usuário pode ter comprado a última vaga
}
```

**Padrão seguro — operação atômica via SQL:**
```sql
-- ✅ Decrementar e verificar em uma única operação atômica
UPDATE eventos
SET vagas = vagas - 1
WHERE id = $1 AND vagas > 0
RETURNING id, vagas;
-- Se não retornar nenhuma linha: estoque esgotado
```

```typescript
// ✅ Ou via função SQL com transação
const { data, error } = await supabase.rpc('reservar_vaga', { evento_id: eventoId, user_id: userId })
if (error || !data) throw new Error('Ingressos esgotados')
```

### 6.2 — Outros Vetores de Lógica de Negócio

Audite:
- Quantidade de itens pode ser manipulada para valor negativo?
- Preço calculado no cliente e enviado ao backend sem revalidação?
- Usuário pode comprar ingresso para evento já encerrado ou cancelado?
- Ingresso pode ser transferido para outro usuário sem validação?

**Checklist da seção:**
- [ ] Decremento de estoque feito em operação atômica (SQL UPDATE com WHERE vagas > 0)
- [ ] Preço/valor NUNCA vem do cliente — sempre recalculado no servidor
- [ ] Quantidade de itens validada no servidor com mínimo de 1
- [ ] Status do evento verificado no servidor antes de permitir compra
- [ ] Nenhuma lógica de desconto, capacidade ou preço calculada apenas no frontend

---

## SEÇÃO 7 — Mass Assignment / Over-Posting

> Quando o backend aceita campos que o usuário não deveria poder alterar.

**Padrão inseguro (sinalizar como 🟠 Alto):**
```typescript
// ❌ Aceita qualquer campo que vier no body
const body = await req.json()
await supabase.from('users').update(body).eq('id', session.user.id)
// Usuário pode enviar { role: 'admin', creditos: 99999 }
```

**Padrão seguro (referência):**
```typescript
// ✅ Whitelist explícita dos campos permitidos
const body = await req.json()
const schema = z.object({
  nome: z.string().max(100),
  bio: z.string().max(500).optional(),
  // role, creditos e campos sensíveis NÃO estão aqui
})
const parsed = schema.parse(body)
await supabase.from('users').update(parsed).eq('id', session.user.id)
```

**Audite especificamente:**
- Rotas de update de perfil (`/api/users/me`, `/api/profile`)
- Rotas de update de pedido ou ingresso pelo usuário
- Qualquer endpoint que faça `update(req.body)` sem schema estrito

**Checklist da seção:**
- [ ] Nenhum endpoint faz `update(body)` sem whitelist de campos via Zod
- [ ] Campos como `role`, `admin`, `credits`, `status`, `price` nunca aceitos em updates de usuário comum
- [ ] Schema de update diferente do schema de create (campos mutáveis explicitamente definidos)

---

## SEÇÃO 8 — CSRF (Cross-Site Request Forgery)

Audite:
- Server Actions do Next.js têm proteção parcial via `SameSite=Lax` nos cookies — mas rotas de API (`/api/...`) **não têm**.
- Qualquer rota de API que muta estado (POST/PUT/PATCH/DELETE) e usa cookies de sessão é potencialmente vulnerável.

**Verificar:**
- Rotas `/api/*` que modificam dados verificam origem da requisição?
- Headers `Origin` ou `Referer` são validados em operações críticas?
- Tokens anti-CSRF implementados em formulários tradicionais?

**Padrão seguro para API Routes:**
```typescript
// ✅ Verificar Origin em rotas de API que usam autenticação por cookie
export async function POST(req: Request) {
  const origin = req.headers.get('origin')
  const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL!]

  if (!origin || !allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403 })
  }
  // ...
}
```

**Checklist da seção:**
- [ ] Rotas `/api/*` que mutam estado validam header `Origin`
- [ ] Server Actions usam cookies com `SameSite=Strict` ou `Lax` (não `None`)
- [ ] Formulários com ações críticas não acessíveis via GET

---

## SEÇÃO 9 — Supabase / Banco de Dados

### 9.1 — Row Level Security (RLS)

Verifique RLS em **todas** as tabelas com dados de usuário.

**Script SQL de diagnóstico (rodar no SQL Editor do Supabase):**
```sql
-- Tabelas com RLS DESATIVADO
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;

-- Todas as políticas existentes
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Política insegura (sinalizar como 🔴 Crítico):**
```sql
-- ❌ Qualquer pessoa (inclusive anônima) acessa tudo
CREATE POLICY "allow_all" ON orders FOR ALL USING (true);
```

**Padrão seguro de referência:**
```sql
-- ✅ Padrão completo por tabela
ALTER TABLE tabela ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON tabela FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own" ON tabela FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own" ON tabela FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own" ON tabela FOR DELETE USING (auth.uid() = user_id);
```

Para cada tabela sem proteção adequada, **gere o SQL completo de correção**.

### 9.2 — service_role_key

- O cliente Supabase com `service_role_key` **nunca** pode ser importado por arquivos com `'use client'`
- Deve existir arquivo separado para o cliente admin (ex: `lib/supabase-admin.ts`)
- Rastrear a árvore de importações se necessário

**Checklist da seção:**
- [ ] RLS ativo em todas as tabelas de usuário
- [ ] Nenhuma policy `USING (true)` em tabela sensível
- [ ] `service_role_key` apenas em arquivos server-side
- [ ] Nenhum arquivo com `'use client'` importa o cliente admin
- [ ] Storage buckets privados com policies corretas (`auth.uid()`)
- [ ] URLs de arquivos privados geradas com `createSignedUrl()`, não `getPublicUrl()`
- [ ] Auth com redirect URLs restritas (sem wildcards em produção)
- [ ] Backups automáticos configurados e testados

---

## SEÇÃO 10 — Obfuscação de IDs

Verifique:
- O projeto usa IDs sequenciais (integer auto-increment) em tabelas expostas via API?
- IDs sequenciais permitem enumeração de recursos por atacantes.

Se sim, sugira migração para UUID v4:
```sql
-- Adicionar coluna UUID pública sem quebrar o schema atual
ALTER TABLE tabela ADD COLUMN public_id UUID DEFAULT gen_random_uuid() NOT NULL;
CREATE UNIQUE INDEX ON tabela(public_id);
-- Após migrar o código para usar public_id, remover o id sequencial das rotas públicas
```

---

## SEÇÃO 11 — Rate Limiting & Proteção contra Abuso

Audite:
- Rate limiting nas rotas de autenticação (login, signup, reset password, verify email)?
- Rate limiting em operações custosas (upload, envio de email, geração de relatório)?
- Proteção contra brute force em senhas?
- CAPTCHA ou mecanismo similar em fluxos críticos?
- Botões de submit desabilitados durante loading (proteção contra duplo clique)?

**Checklist da seção:**
- [ ] Rate limiting em `/api/auth/*` e equivalentes
- [ ] Rate limiting na rota de webhook do Mercado Pago
- [ ] Botões de submit desabilitados durante processamento
- [ ] Operações críticas (pagamento, criação de conta) protegidas contra submissão duplicada
- [ ] Cancelamento de requests com `AbortController` em `useEffect` com fetch

---

## SEÇÃO 12 — Segurança do Frontend & Headers

Audite:
- Verificações de permissão existem só na UI, sem validação no backend?
- Rotas protegidas verificadas apenas com redirect no client (sem check no servidor)?
- Lógica de negócio sensível rodando só no browser?
- Headers de segurança configurados no `next.config.js`?

**Checklist da seção:**
- [ ] `next.config.js` com headers de segurança (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- [ ] Nenhuma verificação de permissão apenas client-side
- [ ] Dados de outros usuários não acessíveis via DevTools / Network tab
- [ ] Nenhuma lógica de preço, desconto ou permissão calculada só no frontend

---

## SEÇÃO 13 — Secrets no Histórico do Git

> Um secret commitado e depois removido ainda existe para sempre no histórico. A seção 4 verifica o código atual — esta seção verifica o histórico completo.

**Ações:**
1. Verificar se `gitleaks` ou `trufflehog` já rodou no repositório alguma vez
2. Listar os tipos de secrets que podem ter sido commitados: chaves MP, Supabase, SMTP, etc.
3. Verificar o `.gitignore` atual — todos os `.env*` estão cobertos?

**Como auditar o histórico (rodar localmente):**
```bash
# Com gitleaks (instalar via brew install gitleaks ou download)
gitleaks detect --source . --verbose

# Com trufflehog
trufflehog git file://. --only-verified
```

**Se secrets forem encontrados no histórico:**
- Revogar e rotacionar a chave imediatamente (mesmo que "removida" depois)
- Usar `git filter-repo` para reescrever o histórico (último recurso, coordenar com o time)
- Considerar o repositório comprometido até a rotação ser confirmada

**Checklist da seção:**
- [ ] `.gitignore` cobre `.env`, `.env.local`, `.env.production`, `.env*.local`
- [ ] `gitleaks` ou `trufflehog` executado no histórico completo do repositório
- [ ] Nenhum secret encontrado no histórico — ou secrets rotacionados se encontrados
- [ ] Considerar adicionar `gitleaks` como pre-commit hook ou CI step

---

## SEÇÃO 14 — Audit Log de Segurança

> Saber *o que aconteceu* é tão importante quanto prevenir. Especialmente para ações administrativas e operações em lote.

**Audite se os seguintes eventos estão sendo logados:**
- Login bem-sucedido e falho (com IP e user agent)
- Tentativas de acesso negado (403)
- Ações administrativas (criar, editar, deletar evento)
- **Deleção em lote** (quem deletou, o quê, quando — especialmente no DashboardAdmin)
- Emissão de ingressos manuais
- Alteração de roles/permissões
- Acesso a dados de outros usuários (tentativas)

**Padrão de referência:**
```typescript
// ✅ Tabela de audit log
await supabase.from('audit_logs').insert({
  user_id: session.user.id,
  action: 'DELETE_BATCH',
  resource_type: 'ingressos',
  resource_ids: ids,
  ip: req.headers.get('x-forwarded-for'),
  user_agent: req.headers.get('user-agent'),
  created_at: new Date().toISOString()
})
```

**Checklist da seção:**
- [ ] Logins falhos registrados com IP
- [ ] Ações administrativas logadas com user_id, timestamp e detalhe da ação
- [ ] Deleções em lote logadas com IDs deletados
- [ ] Logs de segurança em tabela separada com RLS restritivo (apenas admins leem)
- [ ] Logs de segurança **não** deletáveis pelo usuário comum

---

## SEÇÃO 15 — LGPD & Dados Pessoais

> O projeto lida com CPF e possivelmente dados de menores de idade. Isso gera obrigações legais concretas.

**Audite:**

**Minimização de dados:**
- Quais dados pessoais são coletados? Todos são necessários para o serviço?
- CPF é armazenado em texto simples? (Se não usado para validação em tempo real, pode ser armazenado como hash)
- Dados de menores de idade têm tratamento diferenciado e consentimento do responsável?

**Retenção:**
- Existe política de retenção de dados? Dados de usuários inativos são deletados após X meses?
- Ingressos e dados de pagamento têm prazo de guarda definido (fiscal: 5 anos)?

**Direitos do titular:**
- O usuário consegue exportar seus próprios dados? (direito de portabilidade)
- O usuário consegue solicitar exclusão da conta e dados? (direito ao esquecimento)
- Existe fluxo para atender solicitações de titulares?

**Consentimento:**
- Política de privacidade existe e está atualizada?
- Consentimento para uso de dados é explícito no cadastro?
- Dados compartilhados com terceiros (Mercado Pago, SendGrid) estão descritos na política?

**Checklist da seção:**
- [ ] CPF armazenado de forma segura (criptografado ou hashed se não precisa de busca)
- [ ] Dados de menores com consentimento do responsável documentado
- [ ] Política de privacidade acessível e atualizada
- [ ] Fluxo de exclusão de conta e dados implementado
- [ ] Retenção de dados definida e automatizada onde possível
- [ ] DPO (Encarregado de Dados) definido ou justificativa de isenção documentada

---

## SEÇÃO 16 — Dependências & Supply Chain

Audite as dependências do projeto contra vulnerabilidades conhecidas.

**Ações:**
```bash
# Verificar vulnerabilidades conhecidas nas dependências
npm audit

# Ver vulnerabilidades críticas e altas apenas
npm audit --audit-level=high

# Verificar se o lockfile está commitado e atualizado
git status package-lock.json
```

**Checklist da seção:**
- [ ] `npm audit` sem vulnerabilidades críticas ou altas
- [ ] `package-lock.json` (ou `yarn.lock`) commitado no repositório
- [ ] Dependabot ou Renovate configurado para alertas automáticos de CVE
- [ ] Nenhuma dependência com versão `*` ou `latest` no `package.json`
- [ ] Dependências de desenvolvimento não vão para o bundle de produção

---

## SEÇÃO 17 — Infraestrutura, DNS & Monitoramento

**Vercel:**
- Preview deployments apontam para banco de produção? (🔴 Crítico se sim)
- Environment variables separadas por ambiente (dev / staging / prod)?
- Build expõe secrets no bundle público?
- Domínio de produção com HTTPS forçado?

**DNS & Subdomínios:**
- Existem subdomínios apontando para serviços que foram desativados? (risco de subdomain takeover)
- CNAME dangling: subdomínio aponta para Vercel/serviço externo que não está mais reivindicado?
- Verificar todos os registros DNS do domínio principal

**Supabase:**
- Plano atual suporta o crescimento projetado? (conexões, storage, bandwidth)
- Connection pooling configurado?
- Existe ambiente de staging separado de produção?

**Monitoramento:**
- Erros de runtime sendo capturados (Sentry ou equivalente)?
- Alertas de erro em produção configurados?
- Rollback de deploy documentado e testado?

**Checklist da seção:**
- [ ] Preview deployments **não** apontam para o banco de produção
- [ ] Todas as variáveis de ambiente de produção configuradas no dashboard da Vercel
- [ ] Variáveis sensíveis **não** têm prefixo `NEXT_PUBLIC_`
- [ ] Existe ambiente de staging separado
- [ ] Nenhum subdomínio apontando para serviço desativado (subdomain takeover)
- [ ] DNS auditado para registros dangling
- [ ] Monitoramento de erros configurado com alertas
- [ ] Rollback de deploy documentado

---

## RELATÓRIO FINAL

Ao concluir todas as seções, gere um relatório neste formato:

```
## Relatório de Auditoria

**Data:** [data atual]
**Projeto:** [nome do projeto]

### Achados por Severidade

🔴 Crítico (bloqueiam deploy): [N encontrados]
- [arquivo] — [descrição] — [correção necessária]

🟠 Alto (corrigir urgente): [N encontrados]
- [arquivo] — [descrição]

🟡 Médio (corrigir no próximo sprint): [N encontrados]
- [arquivo] — [descrição]

🟢 Baixo (melhorias): [N encontrados]
- [arquivo] — [descrição]

### Checklist Geral

- [ ] Seção 1 — Autenticação & Autorização
- [ ] Seção 2 — IDOR / BOLA
- [ ] Seção 3 — Validação de Inputs & Sanitização
- [ ] Seção 4 — Exposição de Dados Sensíveis
- [ ] Seção 5 — Webhooks & Integridade de Pagamento (Mercado Pago)
- [ ] Seção 6 — Lógica de Negócio & Race Conditions
- [ ] Seção 7 — Mass Assignment / Over-Posting
- [ ] Seção 8 — CSRF
- [ ] Seção 9 — Supabase / Banco de Dados
- [ ] Seção 10 — Obfuscação de IDs
- [ ] Seção 11 — Rate Limiting & Proteção contra Abuso
- [ ] Seção 12 — Segurança do Frontend & Headers
- [ ] Seção 13 — Secrets no Histórico do Git
- [ ] Seção 14 — Audit Log de Segurança
- [ ] Seção 15 — LGPD & Dados Pessoais
- [ ] Seção 16 — Dependências & Supply Chain
- [ ] Seção 17 — Infraestrutura, DNS & Monitoramento

### Próximos Passos (em ordem de prioridade)

1. [correção crítica 1]
2. [correção crítica 2]
...
```

---

*Versão 3.0 — Next.js + Supabase + Vercel + Mercado Pago*