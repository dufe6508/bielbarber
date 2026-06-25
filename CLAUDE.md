# Biel Barber Shop — Sistema de Gerenciamento

> Este documento é o contexto mestre do projeto. Leia tudo antes de gerar qualquer código. Ele reúne: o negócio, as decisões já tomadas, a arquitetura escolhida, o modelo de dados e o que ainda está em aberto.

---

## 1. O negócio

- **Nome:** Biel Barber Shop
- **Local:** Vale do Jatobá, Belo Horizonte (MG)
- **Estilo:** urbano, "de quebrada" — não é barbearia premium/clean corporativa
- **Equipe:** 1 barbeiro (o próprio dono), atualmente sem funcionários
- **Volume:** 10–12 cortes/dia, folga domingo e segunda
- **Público:** jovens, 14–30 anos, moradores do bairro
- **Futuro (fora do MVP):** corte a domicílio — não entra agora, mas o modelo de dados não deve impedir essa expansão depois

### Sistema atual e a dor principal
Hoje usa o **SalonSoft** (R$30/mês). O fluxo é: cliente entra no site → digita número → escolhe horário → pronto, sem login, sem dados extras. O problema não é a praticidade (que deve ser **mantida**), é a **falta de controle**: sem gestão real de clientes, pagamentos, estoque ou financeiro. O barbeiro também não calcula duração de serviço — hoje ele pede pro cliente marcar 2 horários manualmente quando o serviço é mais longo (ex: pintura + corte).

**Regra de ouro do projeto:** zero fricção para o cliente (nome + telefone, sem senha, sem cadastro chato). Toda a complexidade nova fica escondida no backend e no painel do admin — não no fluxo do cliente.

> Decisão: **não** vamos calcular automaticamente a duração somada dos serviços. Na prática o tempo de cada serviço varia muito (depende do cliente, do cabelo, etc.), então uma soma automática gera horários enganosos. O sistema apenas registra os serviços escolhidos; o controle de overbooking/duração continua sendo uma decisão manual do barbeiro, como é hoje.

---

## 2. Regras de negócio confirmadas

### Agendamento
- Cliente escolhe um ou mais serviços (sem cálculo automático de duração — ver observação acima)
- Cancelamento permitido até **1 hora antes** do horário
- Pagamento: cliente escolhe **pagar agora** (Pix/cartão via Mercado Pago) ou **pagar no local**
- Admin decide, por cliente, quem tem permissão de **pagar no local** (flag manual, ex: clientes de confiança)
- Política de no-show: **ainda não definida** — pendente de conversa com o barbeiro (ver seção 7)
- Identificação do cliente: **nome + telefone, sem senha, sem verificação por OTP** (decisão tomada: manter exatamente como é hoje, zero fricção)

### Mensalistas (pós-pago — correção importante)
- O mensalista **não paga um valor fixo de plano**. Ele corta livremente durante o mês e **só paga depois**, pelo valor somado de tudo que foi cortado no período.
- Existem **2 grupos de mensalista**: um grupo fecha e paga sempre no **dia 10**, outro grupo sempre no **dia 30**. É uma propriedade do cliente (`billing_day`), não uma data igual pra todo mundo.
- No dia de fechamento do grupo dele, o sistema soma todos os atendimentos do período e gera a cobrança (valor total + lista do que foi cortado).
- Ao confirmar pagamento, status muda automaticamente para "pago" e o ciclo reinicia.

### Pacotes / combos (novo — a construir junto com o barbeiro)
- Dois tipos possíveis: pacote de quantidade (ex: "5 cortes") e pacote de serviços combinados (ex: "corte + barba + sobrancelha")
- Pacotes podem incluir produtos da loja também
- **Sem desconto** por enquanto (preço cheio, é mais controle/conveniência do que promoção)

### Loja virtual
- Produtos: gel, pomada, óleo de barba etc. (pode crescer)
- Cliente compra e **retira na hora do corte** (sem entrega por enquanto)
- Admin sobe produto com fotos
- **Controle de estoque simples**: admin edita quantidade manualmente (sem alertas automáticos no MVP)

### Pagamentos
- Gateway: **Mercado Pago** (Pix + cartão) — é o que o barbeiro já usa
- Pagamento sempre opcional entre "agora" ou "no local" (exceto onde o admin restringir)

### Histórico
- Cliente pode consultar seu próprio histórico de cortes (sem precisar de login — busca por telefone)
- Barbeiro vê histórico completo de cada cliente no painel admin (datas, valores, serviços)

### Comunicação
> WhatsApp **fora do escopo por enquanto** — removido do MVP. A estrutura de dados deixa espaço pra adicionar isso depois (ver `NotificationLog` no modelo de dados), mas nenhuma integração real entra nessa fase.

### Admin
- Login separado (somente o barbeiro acessa)
- Dashboard com: financeiro, contabilidade básica, agenda, clientes, mensalistas, produtos
- Pode bloquear clientes
- Pode definir quais clientes pagam no local
- Interface precisa ser **muito intuitiva** — é o ponto mais sensível de UX do projeto, porque é quem vai usar todo dia

### Tom de voz / copy
- **Neutro e profissional** nos textos do site (confirmado) — não usar gírias pesadas na interface, mesmo sendo uma barbearia de identidade urbana
- Direto ao ponto: cliente cai direto na tela de agendamento ao abrir o site, sem enrolação institucional

### Visual / UI
- **Fase atual: apenas tema claro.** O tema escuro entra depois — mas a estrutura de cores (variáveis/tokens) já nasce pensando em suportar os dois, pra não precisar refatorar tudo no futuro.
- **Direção estética atual (rebrand jun/2026): soft, clean, minimalista, premium.** Branco + azul-marinho (navy), **mono-acento** (uma cor de destaque só: navy). Paleta-base: Oxford Blue `#192338`, Space Cadet `#1E2E4F`, YInMn Blue `#31487A`, Jordy Blue `#8FB3E2`, Lavender `#D9E1F1`. Tokens em OKLCH no `globals.css`. (A direção anterior — stone/concreto + laranja-queimado — foi substituída.)
- Tipografia: fonte condensada para títulos (Barlow Condensed), limpa para corpo (Inter), mono para horários/preços (JetBrains Mono — efeito "ficha/comprovante")
- Elemento de assinatura: a confirmação do agendamento é estilizada como um **ticket/ficha** (referência a ingresso)
- **Multiplataforma** (não mais mobile-only): desktop com navegação lateral (sidebar navy), mobile com top bar + bottom nav. Continua mobile-friendly.

---

## 3. Stack técnica escolhida

| Camada | Escolha | Por quê |
|---|---|---|
| Frontend + Backend | **Next.js (App Router) + TypeScript** | Full-stack num projeto só, fácil de hospedar (Vercel), ecossistema de bibliotecas enorme, ótimo suporte do Claude Code |
| Estilo | **Tailwind CSS** | Rápido, consistente, já preparado para suportar 2 temas no futuro |
| Banco de dados | **PostgreSQL via Supabase** (decisão confirmada) | O projeto é fundamentalmente relacional (cliente → agendamento → serviços → pagamento → pacote/mensalidade), o que SQL resolve nativamente — incluindo os relatórios financeiros. Inclui também Auth (login do admin) e Storage (fotos de produtos) no mesmo serviço. Free tier cobre bem o volume atual da barbearia |
| ORM | **Prisma** | Tipagem forte, migrations simples, gera client a partir do schema |
| Autenticação admin | **Supabase Auth** (email/senha) | Só o barbeiro usa, não precisa de nada elaborado |
| Identificação do cliente | Sem auth — busca por nome+telefone no banco | Mantém a praticidade exigida |
| Pagamentos | **SDK Mercado Pago** (Checkout Pro ou Transparente) + webhook | Já é o que o barbeiro usa, suporta Pix e cartão |
| Deploy | **Vercel** (frontend/backend) + **Supabase** (banco/storage/auth) | Combinação padrão pra esse stack, fácil de manter sem time de DevOps |
| Agendamento de tarefas (cobrança mensal dos mensalistas) | **Vercel Cron** ou **Supabase Edge Functions com cron** | Dispara o fechamento de cada grupo de mensalista (dia 10 / dia 30) automaticamente |

> Observação: essa stack foi escolhida pensando em um projeto solo, sem orçamento fechado ainda, que precisa de um protótipo rápido pra apresentar ao barbeiro. Tudo aqui tem camada gratuita generosa pra essa fase.

---

## 4. Estrutura de pastas proposta

```
biel-barber/
├── app/
│   ├── (cliente)/
│   │   ├── page.tsx                  # Home = tela de agendamento (rota raiz)
│   │   ├── loja/
│   │   │   └── page.tsx
│   │   ├── pacotes/
│   │   │   └── page.tsx
│   │   └── meu-historico/
│   │       └── page.tsx              # busca por telefone, sem login
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── (painel)/
│   │       ├── page.tsx              # visão geral / dashboard
│   │       ├── agenda/
│   │       ├── clientes/
│   │       ├── mensalistas/
│   │       ├── financeiro/
│   │       ├── produtos/
│   │       └── pacotes/
│   ├── api/
│   │   ├── appointments/
│   │   │   ├── route.ts              # GET (lista) / POST (criar)
│   │   │   └── [id]/route.ts         # PATCH (status, cancelar)
│   │   ├── services/route.ts
│   │   ├── products/route.ts
│   │   ├── orders/route.ts
│   │   ├── packages/route.ts
│   │   ├── clients/
│   │   │   ├── route.ts
│   │   │   └── [phone]/history/route.ts
│   │   ├── subscriptions/route.ts
│   │   ├── payments/
│   │   │   └── mercadopago/
│   │   │       ├── create/route.ts
│   │   │       └── webhook/route.ts
│   │   └── notifications/send/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                           # botões, inputs, cards genéricos
│   ├── booking/                      # stepper, seletor de serviço, grade de horários, ticket de confirmação
│   ├── store/
│   ├── admin/
│   └── theme/                        # ThemeProvider + ThemeToggle
├── lib/
│   ├── prisma.ts
│   ├── supabase.ts
│   ├── mercadopago.ts
│   ├── auth.ts
│   └── utils/
│       └── slots.ts                  # geração/listagem de horários disponíveis
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── .env.example
├── CLAUDE.md                         # este arquivo
└── package.json
```

---

## 5. Modelo de dados (entidades principais)

```
Client
  id, name, phone (único), blocked (bool), can_pay_locally (bool), created_at

Service
  id, name, duration_minutes, price, active

Appointment
  id, client_id, date, start_time, status (scheduled | completed | cancelled | no_show),
  payment_status (pending | paid), payment_method (pix | card | local), total_price, created_at

AppointmentService   (N:N entre Appointment e Service)
  appointment_id, service_id, price_at_time

Package
  id, name, description, type (quantity | combo), price, included_services (json/relacional),
  included_products (json/relacional), validity_days, active

ClientPackage
  id, client_id, package_id, purchased_at, uses_remaining, expires_at, status (active | expired)

Subscription (mensalista — pós-pago)
  id, client_id, billing_day (10 | 30 — propriedade do cliente, define o grupo dele),
  status (active | inactive), current_cycle_total (soma do que já foi cortado no ciclo atual),
  last_payment_date, last_payment_amount, next_billing_date

Product
  id, name, description, price, stock_quantity, image_url, active

Order
  id, client_id, total, payment_status, payment_method, pickup_status, created_at

OrderItem
  order_id, product_id, quantity, price_at_time

Payment
  id, reference_type (appointment | order | subscription), reference_id,
  amount, method, status (pending | paid | failed), mercadopago_payment_id, paid_at

NotificationLog
  id, client_id, type (confirmation | reminder | billing), channel (whatsapp),
  status (sent | failed), content, sent_at

AdminUser
  id, email, password_hash (via Supabase Auth)
```

---

## 6. Fluxo de agendamento (lógica core)

1. Cliente seleciona um ou mais serviços (cada um registrado individualmente, sem soma de duração)
2. Cliente escolhe um horário disponível na agenda
3. Cliente escolhe forma de pagamento: agora (Pix/cartão via Mercado Pago) ou no local (somente se `client.can_pay_locally` for true ou se for a primeira vez — **regra exata a definir com o barbeiro**)
4. Cliente informa nome + telefone (sem senha)
5. Sistema cria o `Appointment`
6. Se o cliente for mensalista (`Subscription` ativa), o valor do atendimento entra na soma do `current_cycle_total` em vez de gerar cobrança imediata; senão, segue o pagamento normal (agora/local)
7. No dia de fechamento do grupo do mensalista (10 ou 30), o sistema gera a cobrança do ciclo e zera o `current_cycle_total`

---

## 7. Pontos ainda em aberto (decidir com o barbeiro antes ou durante o desenvolvimento)

- [ ] Política de no-show (bloqueio? taxa? nada por enquanto?)
- [ ] Lista definitiva de serviços e preços atuais
- [ ] Definição final dos pacotes/planos (quantidade de cortes, combos, preços)
- [ ] Regra exata de quem pode pagar no local (manual por cliente vs. critério automático, ex: só depois do 1º agendamento pago)
- [ ] Quais clientes já são mensalistas hoje e em qual grupo (dia 10 ou dia 30) cada um se encaixa
- [ ] CNPJ/MEI do barbeiro (necessário para conta Mercado Pago business, se ainda não tiver)
- [ ] WhatsApp: fora do escopo agora, mas quando entrar, decidir provedor (API oficial via BSP é o caminho recomendado pra evitar banimento de número)

---

## 8. Roadmap por fases

**Fase 1 — MVP (estrutura e fluxo principal)**
- Agendamento completo (seleção de serviço, horário, pagamento, confirmação — sem cálculo automático de duração)
- Loja com produtos e estoque manual
- Pacotes (cadastro e exibição, sem lógica de uso ainda)
- Painel admin: login, agenda do dia, lista de clientes, cadastro de produtos
- Tema claro (estrutura de cores já pronta pra receber o tema escuro depois)

**Fase 2 — Controle e automação**
- Integração real com Mercado Pago (Pix/cartão funcionando de ponta a ponta)
- Lógica de mensalistas pós-pago: acúmulo do ciclo + fechamento automático nos dias 10/30
- Lógica de uso de pacotes (descontar cortes/usos)
- Painel financeiro completo
- Tema escuro (toggle)

**Fase 3 — Expansão**
- Corte a domicílio
- Integração com WhatsApp (confirmação, lembrete, cobrança de mensalidade)
- Alertas automáticos de estoque baixo
- Fidelidade / pontos
- Avaliações de clientes
- Cupons e promoções na loja

---

## 9. Diretrizes de design (resumo rápido para a IU)

- **Fase atual: só tema claro.** Estrutura de cores em variáveis/tokens desde o início pra não precisar refatorar quando o tema escuro entrar (Fase 2)
- Paleta (rebrand jun/2026): branco/off-white para fundo/superfície, **navy como destaque único (mono-acento)**. Base: Oxford Blue/Space Cadet/YInMn/Jordy Blue/Lavender. Sem 2ª cor — mensalistas/pacotes também usam navy.
- Tipografia: condensada em títulos (Barlow), sans limpa no corpo (Inter), mono em horários e preços (JetBrains)
- Elemento de assinatura: confirmação de agendamento estilizada como ticket/ficha
- **Responsivo multiplataforma**: desktop = sidebar lateral; mobile = navegação inferior por abas (Agendar / Loja / Pacotes / Histórico)
- Tom de copy: neutro e profissional, direto ao ponto, sem enrolação institucional
