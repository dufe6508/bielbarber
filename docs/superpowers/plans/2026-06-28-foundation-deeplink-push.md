# Foundation: Deep Link Base + Push Notifications Estrutural

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar slugs URL-safe em Service/Product/Package, criar rotas de deep link no app do cliente, e preparar a estrutura completa de Push Notifications sem implementar envio real.

**Architecture:** Slugs são gerados automaticamente pelo servidor a partir do `nome` quando um registro é criado, usando um utilitário `slugify`. As rotas dinâmicas Next.js `[slug]` interceptam o deep link e pré-populam o estado do store antes de renderizar a página existente. Push Notifications ficam como schema + API routes stub — nenhuma lib de envio é instalada nesta fase.

**Tech Stack:** Next.js 16 App Router, Prisma 7, TypeScript, Zustand (booking store já existe em `store/`), TanStack Query, Zod 4.

## Global Constraints

- Next.js 16.2.9 — params de rotas dinâmicas são `Promise<{slug: string}>`, sempre `await params`
- Prisma 7 — `prisma generate` obrigatório após toda mudança no schema
- Tailwind 4 — sem `@apply`, só classes utilitárias
- Sem instalar novas dependências neste plano — tudo com stdlib e deps existentes
- `revalidateTag` de `"next/cache"` para invalidar cache após mutações
- Auth admin via `getAdminSession()` de `@/lib/auth` em todas as routes admin
- Slugs são únicos por modelo — colisão deve acrescentar sufixo numérico (`-2`, `-3`, etc.)

---

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `lib/slugify.ts` | Criar | Utilitário slugify + geração única com fallback numérico |
| `prisma/schema.prisma` | Modificar | Adicionar `slug` em Service/Product/Package; novas tabelas TimeBlock, PushSubscription, NotificationPreference; campos motivoBloqueio/checkinEm |
| `prisma/migrations/` | Auto-gerado | `prisma migrate dev` |
| `app/api/admin/servicos/route.ts` | Modificar | Gerar slug no POST |
| `app/api/admin/servicos/[id]/route.ts` | Modificar | Atualizar slug se nome mudar no PATCH |
| `app/api/admin/produtos/route.ts` | Modificar | Gerar slug no POST |
| `app/api/admin/produtos/[id]/route.ts` | Modificar | Atualizar slug se nome mudar |
| `app/api/admin/pacotes/route.ts` | Modificar | Gerar slug no POST |
| `app/api/admin/pacotes/[id]/route.ts` | Modificar | Atualizar slug se nome mudar |
| `app/(cliente)/agendar/[slug]/page.tsx` | Criar | Deep link → BookingStepper com serviço pré-selecionado |
| `app/(cliente)/loja/[slug]/page.tsx` | Criar | Deep link → Loja com produto em destaque |
| `app/(cliente)/pacotes/[slug]/page.tsx` | Criar | Deep link → Pacotes com pacote em destaque |
| `app/api/push/subscribe/route.ts` | Criar | POST salva PushSubscription |
| `app/api/push/unsubscribe/route.ts` | Criar | DELETE desativa subscription |
| `app/api/push/preferences/route.ts` | Criar | GET + PATCH preferências do cliente |
| `lib/notifications/events.ts` | Criar | Tipos de eventos de notificação |
| `lib/notifications/push.ts` | Criar | Stub do sender (log only) |
| `lib/cache.ts` | Modificar | Adicionar `cachedGaleria` (reservado) — não neste plano |

---

### Task 1: Schema — Slugs + TimeBlock + Push + Campos extras

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `Service.slug String @unique`, `Product.slug String @unique`, `Package.slug String @unique`, modelo `TimeBlock`, modelo `PushSubscription`, modelo `NotificationPreference`, `Client.motivoBloqueio String?`, `Appointment.checkinEm DateTime?`

- [ ] **Step 1: Adicionar campos ao schema**

Abrir `prisma/schema.prisma`. Fazer as seguintes adições:

No modelo `Service`, após `ordem Int @default(0)`, adicionar:
```prisma
  slug  String  @unique  @default("")
```

No modelo `Product`, após `ordem Int @default(0)`, adicionar:
```prisma
  slug  String  @unique  @default("")
```

No modelo `Package`, após `ordem Int @default(0)`, adicionar:
```prisma
  slug  String  @unique  @default("")
```

No modelo `Client`, após `podePagarLocal Boolean`, adicionar:
```prisma
  motivoBloqueio String?   @map("motivo_bloqueio")
```

No modelo `Appointment`, após `criadoEm DateTime`, adicionar:
```prisma
  checkinEm DateTime? @map("checkin_em")
```

- [ ] **Step 2: Adicionar novas tabelas ao schema**

Após o modelo `NotificationLog`, adicionar:

```prisma
model TimeBlock {
  id       String   @id @default(uuid())
  data     DateTime @db.Date
  inicio   String
  fim      String
  motivo   String?
  criadoEm DateTime @default(now()) @map("criado_em")

  @@index([data])
  @@map("blocos_tempo")
}

model PushSubscription {
  id        String   @id @default(uuid())
  clienteId String   @map("cliente_id")
  endpoint  String   @unique
  p256dh    String   @map("p256dh")
  auth      String
  userAgent String?  @map("user_agent")
  ativo     Boolean  @default(true)
  criadoEm  DateTime @default(now()) @map("criado_em")

  cliente Client @relation(fields: [clienteId], references: [id])

  @@index([clienteId])
  @@map("push_subscriptions")
}

model NotificationPreference {
  id                 String   @id @default(uuid())
  clienteId          String   @unique @map("cliente_id")
  pushAtivo          Boolean  @default(true)  @map("push_ativo")
  whatsappAtivo      Boolean  @default(false) @map("whatsapp_ativo")
  confirmacao        Boolean  @default(true)
  lembrete           Boolean  @default(true)
  promocao           Boolean  @default(false)
  assinaturaVencendo Boolean  @default(true)  @map("assinatura_vencendo")
  estoqueNovo        Boolean  @default(false) @map("estoque_novo")

  cliente Client @relation(fields: [clienteId], references: [id])

  @@map("preferencias_notificacao")
}
```

Adicionar também as relations inversas no modelo `Client` (dentro do bloco Client, após `notificacoes NotificationLog[]`):
```prisma
  pushSubscriptions      PushSubscription[]
  notificationPreference NotificationPreference?
```

- [ ] **Step 3: Rodar migration**

```bash
npx prisma migrate dev --name "add-slugs-timeblock-push-campos-extras"
```

Esperado: migration criada e aplicada com sucesso. Nenhuma tabela existente deve ser destruída.

- [ ] **Step 4: Verificar geração do client**

```bash
npx prisma generate
```

Esperado: `Generated Prisma Client` sem erros. O campo `slug` deve aparecer nos tipos `Service`, `Product`, `Package`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: schema — slugs, TimeBlock, PushSubscription, NotificationPreference"
```

---

### Task 2: Utilitário `slugify` com unicidade

**Files:**
- Create: `lib/slugify.ts`

**Interfaces:**
- Produces:
  - `slugify(str: string): string` — converte string para slug URL-safe
  - `uniqueSlug(base: string, model: "service" | "product" | "package"): Promise<string>` — gera slug único verificando colisões no banco

- [ ] **Step 1: Criar o arquivo**

```ts
// lib/slugify.ts
import { prisma } from "@/lib/prisma"

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

export async function uniqueSlug(
  base: string,
  model: "service" | "product" | "package",
  excludeId?: string
): Promise<string> {
  const candidate = slugify(base)
  const check = async (s: string) => {
    const where = excludeId
      ? { slug: s, id: { not: excludeId } }
      : { slug: s }
    if (model === "service")  return prisma.service.findFirst({ where, select: { id: true } })
    if (model === "product")  return prisma.product.findFirst({ where, select: { id: true } })
    return prisma.package.findFirst({ where, select: { id: true } })
  }

  if (!(await check(candidate))) return candidate

  for (let i = 2; i <= 99; i++) {
    const s = `${candidate}-${i}`
    if (!(await check(s))) return s
  }
  // fallback com timestamp (colisões extremas)
  return `${candidate}-${Date.now()}`
}
```

- [ ] **Step 2: Testar manualmente no terminal**

```bash
node -e "
const { slugify } = require('./lib/slugify.ts')
// Nota: requer ts-node ou tsx. Verificar via build ou teste inline.
console.log(slugify('Corte Americano'))      // 'corte-americano'
console.log(slugify('Low Fade & Degradê!'))  // 'low-fade-degrade'
console.log(slugify('  --Texto--  '))        // 'texto'
"
```

Se `tsx` não estiver disponível, verificar no Step 3 do Task 3 ao rodar a rota que usa o slug.

- [ ] **Step 3: Commit**

```bash
git add lib/slugify.ts
git commit -m "feat: utilitário slugify com geração única por modelo"
```

---

### Task 3: Auto-slug nas rotas admin de Service

**Files:**
- Modify: `app/api/admin/servicos/route.ts` (POST — gerar slug)
- Modify: `app/api/admin/servicos/[id]/route.ts` (PATCH — regen slug se nome mudar)

**Interfaces:**
- Consumes: `uniqueSlug(base, "service", excludeId?)` de `@/lib/slugify`
- Produces: campo `slug` preenchido em todo `Service` criado/editado via admin

- [ ] **Step 1: Atualizar POST em `app/api/admin/servicos/route.ts`**

Adicionar import no topo:
```ts
import { uniqueSlug } from "@/lib/slugify"
```

Dentro do `prisma.service.create({ data: { ... } })`, adicionar o campo slug após `nome`:
```ts
slug: await uniqueSlug(String(b.nome).slice(0, 80), "service"),
```

O bloco `data` fica:
```ts
data: {
  nome: String(b.nome).slice(0, 80),
  slug: await uniqueSlug(String(b.nome).slice(0, 80), "service"),
  descricao: b.descricao ? String(b.descricao).slice(0, 240) : null,
  preco: b.preco,
  duracaoMinutos: Number(b.duracaoMinutos) || 30,
  slotsNecessarios: Math.max(1, Number(b.slotsNecessarios) || 1),
  capacidadePorSlot: Math.max(1, Number(b.capacidadePorSlot) || 1),
  ativo: b.ativo ?? true,
  ordem: Number(b.ordem) || 0,
},
```

- [ ] **Step 2: Atualizar PATCH em `app/api/admin/servicos/[id]/route.ts`**

Adicionar import no topo:
```ts
import { uniqueSlug } from "@/lib/slugify"
```

Dentro do bloco de montagem do `data`, após `if (b.nome !== undefined) data.nome = ...`, adicionar:
```ts
if (b.nome !== undefined) {
  data.slug = await uniqueSlug(String(b.nome).slice(0, 80), "service", id)
}
```

**Atenção:** o bloco existente `if (b.nome !== undefined) data.nome = String(b.nome).slice(0, 80)` deve ser expandido para:
```ts
if (b.nome !== undefined) {
  data.nome = String(b.nome).slice(0, 80)
  data.slug = await uniqueSlug(String(b.nome).slice(0, 80), "service", id)
}
```

- [ ] **Step 3: Testar via curl**

```bash
curl -s -X POST http://localhost:3000/api/admin/servicos \
  -H "Content-Type: application/json" \
  -d '{"nome":"Corte Degradê","preco":35}' | grep -o '"slug":"[^"]*"'
```

Esperado: `"slug":"corte-degrade"`

Criar outro com mesmo nome:
```bash
curl -s -X POST http://localhost:3000/api/admin/servicos \
  -H "Content-Type: application/json" \
  -d '{"nome":"Corte Degradê","preco":35}' | grep -o '"slug":"[^"]*"'
```

Esperado: `"slug":"corte-degrade-2"`

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/servicos/route.ts app/api/admin/servicos/[id]/route.ts
git commit -m "feat: auto-slug em Service (create + update)"
```

---

### Task 4: Auto-slug nas rotas admin de Product e Package

**Files:**
- Modify: `app/api/admin/produtos/route.ts`
- Modify: `app/api/admin/produtos/[id]/route.ts`
- Modify: `app/api/admin/pacotes/route.ts`
- Modify: `app/api/admin/pacotes/[id]/route.ts`

**Interfaces:**
- Consumes: `uniqueSlug` de `@/lib/slugify`
- Produces: campo `slug` preenchido em todo `Product` e `Package` criado/editado

- [ ] **Step 1: Produto — POST**

Em `app/api/admin/produtos/route.ts`, adicionar import e slug no `prisma.product.create`:
```ts
import { uniqueSlug } from "@/lib/slugify"
// ...
data: {
  nome: String(b.nome).slice(0, 80),
  slug: await uniqueSlug(String(b.nome).slice(0, 80), "product"),
  // ...demais campos inalterados
}
```

- [ ] **Step 2: Produto — PATCH**

Em `app/api/admin/produtos/[id]/route.ts` (padrão idêntico ao de servicos):
```ts
import { uniqueSlug } from "@/lib/slugify"
// ...
if (b.nome !== undefined) {
  data.nome = String(b.nome).slice(0, 80)
  data.slug = await uniqueSlug(String(b.nome).slice(0, 80), "product", id)
}
```

- [ ] **Step 3: Pacote — POST**

Ler `app/api/admin/pacotes/route.ts`. Adicionar o mesmo padrão:
```ts
import { uniqueSlug } from "@/lib/slugify"
// no prisma.package.create data:
slug: await uniqueSlug(String(b.nome).slice(0, 80), "package"),
```

- [ ] **Step 4: Pacote — PATCH**

Ler `app/api/admin/pacotes/[id]/route.ts`. Mesmo padrão dos outros:
```ts
import { uniqueSlug } from "@/lib/slugify"
if (b.nome !== undefined) {
  data.nome = String(b.nome).slice(0, 80)
  data.slug = await uniqueSlug(String(b.nome).slice(0, 80), "package", id)
}
```

- [ ] **Step 5: Testar Product slug**

```bash
curl -s -X POST http://localhost:3000/api/admin/produtos \
  -H "Content-Type: application/json" \
  -d '{"nome":"Pomada Matte","preco":29.90,"quantidadeEstoque":10}' | grep -o '"slug":"[^"]*"'
```

Esperado: `"slug":"pomada-matte"`

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/produtos/route.ts app/api/admin/produtos/[id]/route.ts \
        app/api/admin/pacotes/route.ts app/api/admin/pacotes/[id]/route.ts
git commit -m "feat: auto-slug em Product e Package"
```

---

### Task 5: Rotas de Deep Link — `/agendar/[slug]`

**Files:**
- Create: `app/(cliente)/agendar/[slug]/page.tsx`

**Interfaces:**
- Consumes: `Service.slug` via `GET /api/servicos`; store de booking (Zustand) já existe no projeto
- Produces: URL `/agendar/corte-americano` pré-seleciona o serviço e redireciona para a home com BookingStepper aberto

**Nota arquitetural:** O BookingStepper vive na home `app/(cliente)/page.tsx`. A rota `[slug]` não duplica o stepper — ela resolve o slug, grava no localStorage/sessionStorage o serviçoId pré-selecionado, e redireciona para `/`. A home lê esse valor na montagem e inicia o booking já com o serviço.

- [ ] **Step 1: Criar a rota**

```tsx
// app/(cliente)/agendar/[slug]/page.tsx
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

type Props = { params: Promise<{ slug: string }> }

export default async function AgendarSlugPage({ params }: Props) {
  const { slug } = await params
  const servico = await prisma.service.findUnique({
    where: { slug, ativo: true },
    select: { id: true },
  })
  // Slug inválido ou inativo → volta para home sem pré-seleção
  if (!servico) redirect("/")
  // Passa o servicoId via query param; a home o lê e popula o store
  redirect(`/?servico=${servico.id}`)
}
```

- [ ] **Step 2: Ler o `?servico` na home e pré-popular o store**

Abrir `app/(cliente)/page.tsx`. Localizar onde o componente da home é montado.

O componente da home precisa ler `searchParams` e passar o `servicoId` para o BookingStepper ou store.

Adicionar em `app/(cliente)/page.tsx` (é Server Component):
```tsx
// app/(cliente)/page.tsx
type Props = { searchParams: Promise<{ servico?: string }> }

export default async function HomePage({ searchParams }: Props) {
  const { servico } = await searchParams
  // Passa como prop para o componente client que renderiza o stepper
  return <HomeClient servicoPreSelecionado={servico ?? null} />
}
```

**Nota:** Se `page.tsx` atual não aceita `searchParams`, verificar se já é async. Adaptar conforme estrutura existente sem quebrar o que já funciona.

- [ ] **Step 3: Criar `HomeClient` ou adaptar o componente existente**

Se a home já tem um componente client (`"use client"`), adicionar a prop `servicoPreSelecionado?: string | null` e dentro do `useEffect`:

```tsx
useEffect(() => {
  if (servicoPreSelecionado) {
    // Chamar a action do booking store para pré-selecionar o serviço
    // O nome exato da action depende do store existente — verificar em store/
    setServicosIds([servicoPreSelecionado])
    abrirStepper() // ou equivalente
  }
}, [servicoPreSelecionado])
```

Antes de implementar: ler `store/` para conhecer o nome exato das actions do booking store.

- [ ] **Step 4: Testar no browser**

Rodar `npm run dev`. Navegar para:
```
http://localhost:3000/agendar/corte-degrade
```

Esperado: redireciona para `/?servico=<uuid>` e o stepper abre com o serviço pré-selecionado.

Testar slug inválido:
```
http://localhost:3000/agendar/inexistente-xyz
```

Esperado: redireciona para `/` sem erro.

- [ ] **Step 5: Commit**

```bash
git add app/\(cliente\)/agendar/
git commit -m "feat: deep link /agendar/[slug] pré-seleciona serviço"
```

---

### Task 6: Deep Links — `/loja/[slug]` e `/pacotes/[slug]`

**Files:**
- Create: `app/(cliente)/loja/[slug]/page.tsx`
- Create: `app/(cliente)/pacotes/[slug]/page.tsx`

**Interfaces:**
- Consumes: `Product.slug`, `Package.slug` via Prisma
- Produces: URLs `/loja/pomada-matte` e `/pacotes/plano-premium` abrem a página correspondente com o item em destaque

- [ ] **Step 1: Criar `/loja/[slug]`**

```tsx
// app/(cliente)/loja/[slug]/page.tsx
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

type Props = { params: Promise<{ slug: string }> }

export default async function LojaSlugPage({ params }: Props) {
  const { slug } = await params
  const produto = await prisma.product.findUnique({
    where: { slug, ativo: true },
    select: { id: true },
  })
  if (!produto) redirect("/loja")
  redirect(`/loja?produto=${produto.id}`)
}
```

- [ ] **Step 2: Criar `/pacotes/[slug]`**

```tsx
// app/(cliente)/pacotes/[slug]/page.tsx
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

type Props = { params: Promise<{ slug: string }> }

export default async function PacotesSlugPage({ params }: Props) {
  const { slug } = await params
  const pacote = await prisma.package.findUnique({
    where: { slug, ativo: true },
    select: { id: true },
  })
  if (!pacote) redirect("/pacotes")
  redirect(`/pacotes?pacote=${pacote.id}`)
}
```

- [ ] **Step 3: Testar no browser**

```
http://localhost:3000/loja/pomada-matte   → /loja?produto=<uuid>
http://localhost:3000/pacotes/plano-x     → /pacotes?pacote=<uuid>
http://localhost:3000/loja/nao-existe     → /loja (sem erro)
```

- [ ] **Step 4: Commit**

```bash
git add app/\(cliente\)/loja/\[slug\]/ app/\(cliente\)/pacotes/\[slug\]/
git commit -m "feat: deep links /loja/[slug] e /pacotes/[slug]"
```

---

### Task 7: Push Notifications — API Routes base

**Files:**
- Create: `lib/notifications/events.ts`
- Create: `lib/notifications/push.ts`
- Create: `app/api/push/subscribe/route.ts`
- Create: `app/api/push/unsubscribe/route.ts`
- Create: `app/api/push/preferences/route.ts`

**Interfaces:**
- Produces:
  - `NotificationEvent` (union type com todos os eventos futuros)
  - `sendPushToClient(clienteId, event): Promise<void>` (stub)
  - `POST /api/push/subscribe` — salva `PushSubscription` no banco
  - `DELETE /api/push/unsubscribe` — desativa subscription por endpoint
  - `GET /api/push/preferences?telefone=` — lê preferências
  - `PATCH /api/push/preferences` — atualiza preferências

- [ ] **Step 1: Criar tipos de eventos**

```ts
// lib/notifications/events.ts
export type NotificationEvent =
  | { type: "agendamento_confirmado"; appointmentId: string }
  | { type: "lembrete_horario";        appointmentId: string; minutesBefore: number }
  | { type: "promocao";                message: string; deepLink?: string }
  | { type: "assinatura_vencendo";     subscriptionId: string; daysLeft: number }
  | { type: "estoque_novo";            productId: string; slug: string }
  | { type: "waitlist_horario_livre";  data: string; clienteId: string }
  | { type: "aniversario";             clienteId: string }
```

- [ ] **Step 2: Criar stub do sender**

```ts
// lib/notifications/push.ts
// ponytail: stub only — real web-push wired in Sprint 3
import type { NotificationEvent } from "./events"

export async function sendPushToClient(
  clienteId: string,
  event: NotificationEvent
): Promise<void> {
  console.log("[push:stub]", { clienteId, event })
}
```

- [ ] **Step 3: Criar `/api/push/subscribe`**

```ts
// app/api/push/subscribe/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const b = await request.json().catch(() => null)
  if (!b?.clienteId || !b?.endpoint || !b?.p256dh || !b?.auth) {
    return NextResponse.json({ error: "Campos obrigatórios: clienteId, endpoint, p256dh, auth" }, { status: 400 })
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: String(b.endpoint) },
    update: {
      p256dh: String(b.p256dh),
      auth: String(b.auth),
      userAgent: b.userAgent ? String(b.userAgent).slice(0, 200) : null,
      ativo: true,
    },
    create: {
      clienteId: String(b.clienteId),
      endpoint: String(b.endpoint),
      p256dh: String(b.p256dh),
      auth: String(b.auth),
      userAgent: b.userAgent ? String(b.userAgent).slice(0, 200) : null,
    },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
```

- [ ] **Step 4: Criar `/api/push/unsubscribe`**

```ts
// app/api/push/unsubscribe/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(request: Request) {
  const b = await request.json().catch(() => null)
  if (!b?.endpoint) {
    return NextResponse.json({ error: "endpoint obrigatório" }, { status: 400 })
  }

  await prisma.pushSubscription.updateMany({
    where: { endpoint: String(b.endpoint) },
    data: { ativo: false },
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Criar `/api/push/preferences`**

```ts
// app/api/push/preferences/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const telefone = searchParams.get("telefone")
  if (!telefone) return NextResponse.json({ error: "telefone obrigatório" }, { status: 400 })

  const cliente = await prisma.client.findUnique({
    where: { telefone },
    select: { id: true, notificationPreference: true },
  })
  if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })

  // Retorna preferências ou defaults se não existirem ainda
  return NextResponse.json(
    cliente.notificationPreference ?? {
      pushAtivo: true, whatsappAtivo: false,
      confirmacao: true, lembrete: true,
      promocao: false, assinaturaVencendo: true, estoqueNovo: false,
    }
  )
}

export async function PATCH(request: Request) {
  const b = await request.json().catch(() => null)
  if (!b?.clienteId) return NextResponse.json({ error: "clienteId obrigatório" }, { status: 400 })

  const allowed = ["pushAtivo","whatsappAtivo","confirmacao","lembrete","promocao","assinaturaVencendo","estoqueNovo"]
  const data: Record<string, boolean> = {}
  for (const key of allowed) {
    if (typeof b[key] === "boolean") data[key] = b[key]
  }

  const prefs = await prisma.notificationPreference.upsert({
    where: { clienteId: String(b.clienteId) },
    update: data,
    create: { clienteId: String(b.clienteId), ...data },
  })

  return NextResponse.json(prefs)
}
```

- [ ] **Step 6: Testar rotas via curl**

```bash
# Subscribe (clienteId falso para testar estrutura)
curl -s -X POST http://localhost:3000/api/push/subscribe \
  -H "Content-Type: application/json" \
  -d '{"clienteId":"fake","endpoint":"https://push.example.com/1","p256dh":"abc","auth":"def"}'
# Esperado: {"ok":true} status 201 (ou 500 se clienteId não existir no banco — OK, valida a rota)

# Preferences GET sem telefone
curl -s http://localhost:3000/api/push/preferences
# Esperado: {"error":"telefone obrigatório"} status 400

# Unsubscribe
curl -s -X DELETE http://localhost:3000/api/push/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"endpoint":"https://push.example.com/1"}'
# Esperado: {"ok":true}
```

- [ ] **Step 7: Commit**

```bash
git add lib/notifications/ app/api/push/
git commit -m "feat: push notifications — tipos de evento, stub sender, API routes base"
```

---

## Checklist Final

- [ ] `prisma migrate status` mostra todas as migrations aplicadas
- [ ] `npx prisma generate` sem erros
- [ ] Todo `Service` criado pelo admin tem `slug` não-vazio
- [ ] Todo `Product` criado tem `slug` não-vazio
- [ ] Todo `Package` criado tem `slug` não-vazio
- [ ] `/agendar/corte-americano` redireciona para `/?servico=<uuid>`
- [ ] `/agendar/inexistente` redireciona para `/` sem 404
- [ ] `/loja/inexistente` redireciona para `/loja` sem 404
- [ ] `POST /api/push/subscribe` retorna 400 sem campos obrigatórios
- [ ] `GET /api/push/preferences` retorna 400 sem `?telefone`
- [ ] `lib/notifications/push.ts` exporta `sendPushToClient`
- [ ] `lib/notifications/events.ts` exporta `NotificationEvent`
- [ ] `npm run build` passa sem erros de TypeScript

---

**Plan complete. Two execution options:**

**1. Subagent-Driven (recommended)** — subagent por task, revisão entre tasks

**2. Inline Execution** — executar na sessão atual com executing-plans
