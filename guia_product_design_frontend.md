# 🎯 Guia Sênior: Product Design & Front-end Engineering

> **Projeto:** `[NOME DO PROJETO]` · **Tipo:** `[EX: SaaS B2B / E-commerce / Dashboard / Landing page]` · **Público:** `[EX: Gestores 40+ / Gen Z / Equipes de TI]`
>
> *Preencha os campos acima para contextualizar o guia ao seu projeto.*

---

## 🗺️ Visão Geral de Fases

| Fase | Foco Principal | Entregáveis-Chave |
|------|---------------|-------------------|
| **Descoberta** | Princípios, Ferramentas, Pesquisa | Design Brief, Auditoria, Design Tokens |
| **Design** | Componentes, Hierarquia, Psicologia | Sistema de Design, Protótipos, Ícones |
| **Desenvolvimento / QA** | Hand-off, Estados, Acessibilidade | Storybook, WCAG, Checklist de Entrega |

---

## 📦 Bloco 1 — Habilidades e Ferramentas de Interface

### 🔵 FASE DE DESCOBERTA

| # | Habilidade / Prática | MVP ou Plus | Ferramenta / Referência |
|---|----------------------|:-----------:|-------------------------|
| 1 | **Design Tokens** — nomear e exportar cores, tipografia, espaçamentos como variáveis compartilhadas entre design e código | ⭐ MVP | Figma Variables, Style Dictionary, Token Studio |
| 2 | **Design System Audit** — mapear inconsistências antes de escalar | ⭐ MVP | Figma Plugin: *Design Lint*, *Similayer* |
| 3 | Definição de **breakpoints responsivos** (360/768/1280/1440px) | ⭐ MVP | CSS Grid + custom properties |
| 4 | Documentação de **user flows** e jornadas críticas | ⭐ MVP | FigJam, Whimsical |
| 5 | Mapeamento de **estados de interface** (vazio, erro, loading, sucesso) desde a Descoberta | ⭐ MVP | Figma Component Properties |
| 6 | Workshop de **Design Sprint** para alinhar stakeholders antes do pixel | ➕ Plus | FigJam templates, Miro |

### 🟡 FASE DE DESIGN

| # | Habilidade / Prática | MVP ou Plus | Ferramenta / Referência |
|---|----------------------|:-----------:|-------------------------|
| 1 | **CSS Grid avançado** — subgrid, named areas para layouts 2D complexos | ⭐ MVP | CSS Grid, Utopia.fyi para fluid grids |
| 2 | **Flexbox + gap** para componentes internos (cards, navs, listas) | ⭐ MVP | Nativo CSS |
| 3 | **Animações de UI** — micro-interações com transições CSS (300–500ms) | ⭐ MVP | CSS `transition`, `@keyframes` |
| 4 | **Animações complexas e scroll-driven** — entrada de seções, parallax | ➕ Plus | GSAP, Framer Motion, CSS `animation-timeline` |
| 5 | **Figma Auto Layout v5** + Component Properties + Variants | ⭐ MVP | Figma nativo |
| 6 | Criação de **Interactive Components** no Figma (hover, pressed) | ➕ Plus | Figma Advanced Prototyping |
| 7 | **Geração de código** com Figma-to-code plugins | ➕ Plus | Anima, Locofy, Builder.io |

### 🔴 FASE DE DESENVOLVIMENTO / QA

| # | Habilidade / Prática | MVP ou Plus | Ferramenta / Referência |
|---|----------------------|:-----------:|-------------------------|
| 1 | **Storybook** — documentar e testar componentes isoladamente | ⭐ MVP | Storybook 8+, Chromatic |
| 2 | **CSS Custom Properties** como runtime theming (dark/light mode) | ⭐ MVP | CSS Variables + `prefers-color-scheme` |
| 3 | **Testes de acessibilidade** automatizados no CI | ⭐ MVP | axe-core, Playwright, Storybook a11y addon |
| 4 | **Visual regression testing** para proteger o sistema de design | ➕ Plus | Chromatic, Percy, Playwright screenshots |
| 5 | **Fluid typography + clamp()** para responsividade sem breakpoints | ➕ Plus | Utopia.fyi, CSS `clamp()` |

#### 🔌 Plugins do Figma Essenciais

| Plugin | Para que serve | Fase |
|--------|----------------|------|
| **Token Studio** | Exportar Design Tokens para código | Descoberta → Dev |
| **Design Lint** | Detectar inconsistências de estilos | Design → QA |
| **Iconify** | Importar ícones de qualquer lib diretamente no Figma | Design |
| **Similayer** | Selecionar camadas similares em massa | Design |
| **Autoflow** | Desenhar fluxos de usuário sobre os frames | Descoberta |
| **FramerX Bridge** / **Anima** | Exportar protótipos com código real | Dev |
| **A11y - Focus Orderer** | Definir ordem de foco para acessibilidade | QA |
| **Content Reel** | Popular mockups com dados realistas | Design |

---

## 📦 Bloco 2 — Biblioteca e Gestão de Ícones

### 🔵 FASE DE DESCOBERTA — Escolha da Biblioteca

| Rank | Biblioteca | Estilo Visual | Melhor Para | Nº de Ícones | Licença |
|------|-----------|--------------|-------------|:------------:|---------|
| 🥇 | **Lucide** | Limpo, geométrico, linha fina | SaaS, Dashboards, B2B moderno | 1.400+ | MIT |
| 🥈 | **Phosphor Icons** | Flexível (thin/light/bold/fill/duotone) | E-commerce, Multi-plataforma, Gen Z | 1.200+ | MIT |
| 🥉 | **Tabler Icons** | Angular, grid perfeito de 24px | Ferramentas técnicas, TI, Dev Tools | 5.000+ | MIT |

> **Sugestão por contexto:**
> - **SaaS B2B / Dashboard / TI** → Lucide (tom profissional, consistente, excelente React pkg)
> - **E-commerce / Gen Z / Lifestyle** → Phosphor (variedade de pesos cria personalidade visual)
> - **Ferramentas e produtos técnicos** → Tabler (maior volume, tudo coberto)

### 🟡 FASE DE DESIGN — Organização no Figma

**Convenção de nomenclatura recomendada:**
```
[categoria]/[nome-descritivo]-[variante]
Exemplos:
  navigation/arrow-right
  action/trash-outlined
  status/check-filled
  finance/wallet-duotone
```

| Regra | Detalhe |
|-------|---------|
| **Tamanho base** | 24×24px (grid 8px), variantes: 16 e 32px |
| **Stroke width** | Fixo em 1.5px (não escale o stroke) |
| **Frames nomeados** | `icon/[categoria]/[nome]` no Figma |
| **Auto Layout** | Ícone dentro de frame com padding 4px (token: `icon-padding-sm`) |
| **Cor via Style** | Sempre `currentColor` no SVG; controlar cor pelo token `color-icon-default` |

### SVG vs Web Component vs React Component

| Abordagem | Quando usar | Prós | Contras |
|-----------|-------------|------|---------|
| **SVG inline** | Projetos pequenos, controle total | Colorável por CSS | Polui o DOM |
| **React component (Lucide-react)** | Apps React/Next.js | Tree-shaking, tipado | Só React |
| **`<img>` + sprite sheet** | Sites estáticos, CMS | Cache do browser | Não colorível |
| **Web Component** | Design System multi-framework | Universal | Complexidade extra |

**Recomendação MVP:** Use o pacote oficial React da lib escolhida (`lucide-react`, `@phosphor-icons/react`, `@tabler-icons/react`). Cada ícone é tree-shakeable automaticamente.

### 🔴 FASE DE QA — Otimização e Acessibilidade

| Ferramenta | Propósito |
|-----------|-----------|
| **SVGO** | Minificar SVGs (remove metadados desnecessários) |
| **SVG Sprites** (svg-sprite) | Consolidar em sprite para cache de browser |
| **svgr** | Transformar SVGs em React components automaticamente |
| **eslint-plugin-jsx-a11y** | Alertar sobre ícones sem `aria-label` |

**Regras de acessibilidade para ícones:**
```html
<!-- Ícone decorativo (esconder de leitores de tela) -->
<Icon aria-hidden="true" focusable="false" />

<!-- Ícone funcional (sem texto ao lado) — PRECISA de label -->
<button aria-label="Fechar modal">
  <XIcon aria-hidden="true" />
</button>
```

---

## 📦 Bloco 3 — Hierarquia Visual e Arquitetura da Informação

### 🔵 FASE DE DESCOBERTA — Princípios a Definir

| Princípio | Aplicação Prática | Decisão no Projeto |
|-----------|------------------|--------------------|
| **Grid de 8px** | Todos os espaçamentos múltiplos de 8 (4, 8, 16, 24, 32, 48, 64px) | Definir no Token Studio como `space-1` a `space-8` |
| **Escala Tipográfica Modular** | Razão 1.25 (Major Third) ou 1.333 (Perfect Fourth) | Usar Utopia.fyi para gerar a escala fluid |
| **Contraste WCAG AA** | Texto normal: 4.5:1 mínimo; Texto grande: 3:1 | Validar com Figma Plugin *A11y* ou *Colour Contrast* |
| **Density System** | Definir 3 densidades: Compact / Default / Comfortable | Controlar via CSS custom property `--density` |
| **Z-Index Scale** | Escala semântica: `base(0) / raised(1) / overlay(10) / modal(100) / toast(1000)` | Mapear no Design Token |

### 🟡 FASE DE DESIGN — Hierarquia Visual Avançada

**Escala Tipográfica (razão 1.25 — Major Third):**

| Token | Tamanho (base 16px) | Uso |
|-------|--------------------:|-----|
| `text-xs` | 12.8px | Labels, badges, legendas |
| `text-sm` | 14px | Corpo secundário, tooltips |
| `text-base` | 16px | Corpo principal |
| `text-lg` | 20px | Lead text, subtítulos |
| `text-xl` | 25px | Títulos de seção (H3) |
| `text-2xl` | 31.25px | Títulos de página (H2) |
| `text-3xl` | 39px | Hero titles (H1) |

**Sistema de Densidade de Informação:**

| Densidade | Padding interno de card | Gap entre elementos | Quando usar |
|-----------|:-----------------------:|:-------------------:|-------------|
| **Compact** | 12px | 8px | Tabelas de dados, dashboards densos |
| **Default** | 16px | 16px | 90% das telas |
| **Comfortable** | 24px | 24px | Landing pages, onboarding, marketing |

**Hierarquia por Cor (estratégia de ênfase):**

```
Prioridade 1 → Cor primária (ação principal, CTA, elemento focal)
Prioridade 2 → Cor neutra escura (texto body, headings)
Prioridade 3 → Cor neutra média (texto secundário, labels)
Prioridade 4 → Cor neutra clara (bordas, divisores, backgrounds sutis)
```

> [!TIP]
> **Regra dos 60-30-10:** 60% cor base/neutra · 30% cor secundária/superfície · 10% cor de destaque/ação. Funciona para qualquer paleta.

### 🔴 FASE DE QA — Checklist de Hierarquia

- [ ] Existe apenas **1 elemento de maior ênfase visual** por viewport (não 3 CTAs "primários")
- [ ] O olho do usuário percorre a tela em **F-pattern ou Z-pattern** conforme o tipo de conteúdo
- [ ] Todos os espaçamentos são **múltiplos de 8px** (ou 4px para refinamentos internos)
- [ ] A escala tipográfica **não pula mais de 2 níveis** entre elementos adjacentes
- [ ] Contraste de todos os textos **≥ 4.5:1** (normal) e **≥ 3:1** (grande/bold)

---

## 📦 Bloco 4 — Vieses Cognitivos Aplicados ao UI

### 🟡 FASE DE DESIGN — Os 5 Vieses Críticos

---

#### 1. 🔵 Lei de Hick-Hyman (Complexidade de escolha)
> *"Quanto mais opções, maior o tempo de decisão — e a chance de abandono."*

| | Detalhe |
|-|---------|
| **Como aplicar** | Limitar menus de navegação a 5–7 itens. Usar **Progressive Disclosure**: mostrar apenas as opções relevantes ao contexto atual. Wizard/step-by-step para formulários complexos. |
| **Exemplo prático** | Em vez de mostrar 12 filtros de uma vez num dashboard, agrupar em "Filtros básicos" (visíveis) e "Filtros avançados" (colapsados). |
| **⚠️ Quando evitar** | Não aplicar em contextos de **busca avançada** onde o usuário especialista espera ver todas as opções (ex: query builders de analytics). |

---

#### 2. 🟣 Efeito de Posição Serial (Primacy & Recency)
> *"Lembramos melhor do que vimos primeiro e do que vimos por último."*

| | Detalhe |
|-|---------|
| **Como aplicar** | Colocar o **CTA principal no início e no final** da página. Em listas de preços, posicionar o plano recomendado no centro-direito (primacy visual). Em formulários longos, o primeiro e último campo ficam na memória. |
| **Exemplo prático** | Barra de navegação: logo (primacy) → links → **CTA "Começar grátis"** (recency). |
| **⚠️ Quando evitar** | Em fluxos lineares obrigatórios (checkout, onboarding), não "saltar" o usuário para o fim; o processo deve ter clareza sequencial. |

---

#### 3. 🟢 Efeito Estética-Usabilidade (Heurística Estética)
> *"Interfaces bonitas são percebidas como mais fáceis de usar — mesmo que não sejam."*

| | Detalhe |
|-|---------|
| **Como aplicar** | Investir em **First Impression Design**: tela inicial, hero section e onboarding devem ter o maior cuidado visual. Usar micro-animações de entrada (fade-in + slide 200ms) para criar percepção de qualidade. |
| **Exemplo prático** | Um loading skeleton animado (shimmer) é percebido como mais rápido do que um spinner, mesmo com o mesmo tempo real. |
| **⚠️ Quando evitar** | Nunca sacrificar **usabilidade real** por estética. Se a animação de entrada atrasa a interação em > 300ms, remova. Acessibilidade > Estética. |

---

#### 4. 🟡 Efeito de Enquadramento (Framing Effect)
> *"A mesma informação apresentada de forma diferente gera reações completamente diferentes."*

| | Detalhe |
|-|---------|
| **Como aplicar** | **Planos de assinatura:** "Economize 40% no anual" converte mais que "R$12/mês vs R$20/mês". **Onboarding:** "Você já completou 60%!" é mais motivador que "Faltam 40%". Usar **gain frame** (o que o usuário ganha) em vez de loss frame por padrão. |
| **Exemplo prático** | Badge de produto: "Mais vendido" > "Disponível" > "Últimas unidades" (loss frame, usar com moderação). |
| **⚠️ Quando evitar** | Loss frame ("Você vai perder acesso em 3 dias") gera ansiedade e pode prejudicar a confiança na marca se usado com frequência excessiva (dark pattern). |

---

#### 5. 🔴 Efeito de Mera Exposição + Familiaridade (Jakob's Law)
> *"Usuários passam mais tempo em outros sites. Eles esperam que o seu funcione como os que já conhecem."*

| | Detalhe |
|-|---------|
| **Como aplicar** | Seguir **padrões de UI estabelecidos**: logo à esquerda, busca no topo, carrinho no canto direito, navegação principal horizontal ou sidebar esquerda. Não reinvente a roda em fluxos críticos (checkout, login). |
| **Exemplo prático** | Se o mercado usa "hamburguer menu" no mobile, use. Inovar no padrão de navegação aumenta a curva de aprendizado sem benefício real. |
| **⚠️ Quando evitar** | Em produtos de nicho especializado, os usuários têm convenções próprias (ex: IDEs, DAWs, ferramentas de design). Pesquise o contexto específico antes de adotar padrões de mercado geral. |

---

## 📦 Bloco 5 — Review, QA e Design Critique

### 🔵 FASE DE DESCOBERTA — Roteiro de Design Review

Use estas perguntas em sessões de critique (30–60min por fluxo):

**🎯 Clareza de Propósito**
- [ ] Em 5 segundos, sem contexto, o usuário entende **o que esta tela faz**?
- [ ] Existe um único **ponto de atenção principal** por tela?
- [ ] O CTA principal é **imediatamente identificável**?

**🏗️ Arquitetura e Fluxo**
- [ ] O fluxo respeita o **modelo mental do usuário** (não a lógica interna do sistema)?
- [ ] Existem **dead ends** (situações onde o usuário não sabe o que fazer a seguir)?
- [ ] O usuário consegue **desfazer** ações críticas (confirmação antes de deletar)?

**🎨 Consistência Visual**
- [ ] Todos os elementos usam **tokens do design system** (não valores hardcoded)?
- [ ] Componentes similares se comportam de forma **idêntica** em toda a plataforma?
- [ ] A hierarquia tipográfica é **consistente** (não há 5 tamanhos de fonte diferentes numa mesma tela)?

**♿ Acessibilidade**
- [ ] A interface funciona **apenas com teclado**? (Tab order lógico, focus visível)
- [ ] Os ícones funcionais têm **aria-label** ou texto visível?
- [ ] Não há informação transmitida **apenas por cor**?

**📱 Responsividade**
- [ ] O layout foi testado em **360px** (menor smartphone) e **1440px** (desktop wide)?
- [ ] Elementos de toque têm **área mínima de 44×44px**?

---

### 🔴 FASE DE DESENVOLVIMENTO / QA — Checklist de Hand-off

#### ✅ Estados de Componentes

| Componente | Default | Hover | Active / Pressed | Focus | Disabled | Loading | Empty | Error | Success |
|-----------|:-------:|:-----:|:----------------:|:-----:|:--------:|:-------:|:-----:|:-----:|:-------:|
| Button | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — |
| Input field | ✓ | ✓ | — | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| Card / List item | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | — |
| Dropdown / Select | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Tabela de dados | ✓ | ✓ | — | — | — | ✓ | ✓ | ✓ | — |
| Modal / Dialog | ✓ | — | — | ✓ | — | ✓ | — | ✓ | ✓ |

> [!IMPORTANT]
> **Empty states e Error states** são os mais esquecidos e os mais importantes para a percepção de qualidade. Todo componente que carrega dados **deve ter** um skeleton/loading E um empty state projetado.

#### ✅ Acessibilidade WCAG 2.1 (Nível AA)

| Critério | Check | Ferramenta de Validação |
|----------|:-----:|------------------------|
| Contraste texto normal ≥ 4.5:1 | ☐ | Figma *Colour Contrast* / axe DevTools |
| Contraste texto grande (18pt+) ≥ 3:1 | ☐ | Figma *Colour Contrast* |
| Contraste de componentes UI ≥ 3:1 (bordas, ícones ativos) | ☐ | axe DevTools |
| Focus ring visível em todos os elementos interativos | ☐ | Teste manual com Tab |
| Tab order lógico (segue a ordem de leitura visual) | ☐ | Figma *A11y - Focus Orderer* |
| Sem armadilhas de teclado (keyboard traps) | ☐ | Teste manual |
| Imagens decorativas com `alt=""` | ☐ | axe-core no CI |
| Imagens informativas com `alt` descritivo | ☐ | Revisão manual |
| Formulários com `<label>` associado a cada `<input>` | ☐ | axe-core no CI |
| Mensagens de erro não dependem apenas de cor | ☐ | Revisão manual |
| Animações respeitam `prefers-reduced-motion` | ☐ | CSS media query implementada |
| Controles de vídeo/áudio acessíveis por teclado | ☐ | Teste manual |

#### ✅ Consistência de Spacing e Alinhamento

| Item | Check |
|------|:-----:|
| Todos os espaçamentos são múltiplos de **4 ou 8px** | ☐ |
| Padding interno de componentes usa **tokens** (não valores manuais) | ☐ |
| Alinhamento segue a **grid de colunas** definida (não posição arbitrária) | ☐ |
| Margens entre seções distintas seguem escala (**32, 48, 64, 80px**) | ☐ |
| Componentes do mesmo tipo têm **padding idêntico** (ex: todos os cards usam `space-4`) | ☐ |

#### ✅ Especificações Técnicas de Hand-off

| Item | Entregável | Formato |
|------|-----------|---------|
| Design Tokens exportados | ✓ JSON / CSS Variables | Token Studio → Style Dictionary |
| Especificações de componente | ✓ Anotações no Figma | Figma Dev Mode |
| Assets exportados | ✓ SVG (ícones) + WebP/AVIF (imagens) | Figma Export |
| Documentação de comportamento | ✓ Notas de interação no Figma | Figma Prototype + comentários |
| Storybook com todos os estados | ✓ URL de acesso | Chromatic ou self-hosted |
| Fonts embarcadas | ✓ Variável de font-face ou CDN | Google Fonts / self-hosted |
| Guia de animações | ✓ Timing, easing, duração | Documentado em Notion/Figma |

---

## 🚀 Quadro Resumo por Fase de Sprint

| Sprint / Fase | Ação Principal | Critério de Conclusão (DoD) |
|--------------|---------------|----------------------------|
| **Sprint 0 – Descoberta** | Definir Design Tokens + Escolher biblioteca de ícones + Mapear estados | Token Studio configurado; Ícones na lib do Figma; Estados documentados |
| **Sprint 1 – Design** | Criar componentes base + Aplicar hierarquia visual + Revisar com Critique roteiro | Componentes no Figma com todas as variants; Critique realizado com checklist preenchido |
| **Sprint 2 – Dev Handoff** | Exportar tokens + Configurar Storybook + Validar acessibilidade | axe-core zero erros; Storybook publicado; WCAG AA aprovado |
| **Sprint 3 – QA Final** | Testar todos os estados + Responsividade 360→1440 + Regressão visual | Checklist de hand-off 100% preenchido; Visual regression aprovada |

---

*Gerado por Antigravity · Especialista Sênior em Product Design & Front-end Engineering*
*Versão: 1.0 · Data: 2026-06-25*
