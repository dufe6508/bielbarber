"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Wallet,
  TrendingUp,
  CalendarCheck,
  UserPlus,
  Scissors,
  ShoppingBag,
  Crown,
  Users,
  XCircle,
  Repeat,
  Gauge,
  Loader2,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { ReceitaBarChart, MiniBarChart } from "@/components/admin/Charts";
import { AdminModal } from "@/components/admin/AdminModal";
import { formatarPreco, formatarTelefone } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

// ─── Tipos ──────────────────────────────────────────────────────────────────

type Delta = { texto: string; positivo: boolean };

export type DadosFinanceiro = {
  total: number;
  servicos: number;
  loja: number;
  assinaturas: number;
  mensalistas: number;
  ticket: number;
  atendimentos: number;
  cancelados: number;
  novos: number;
  deltas?: {
    total?: Delta;
    ticket?: Delta;
    cancelados?: Delta;
    novos?: Delta;
  };
};

type RankItem = { nome: string; qtd: number; receita: number };

export type FinanceiroViewProps = {
  mes: string;
  dados: DadosFinanceiro;
  serie: { data: string; servicos: number; loja: number }[];
  rankServicos: RankItem[];
  rankProdutos: RankItem[];
  horas: { hora: string; total: number }[];
  dias: { dia: string; total: number }[];
  ocupacao: number;
  recorrencia: { recorrentes: number; total: number; taxa: number };
};

// ─── Count-up (anima número 0 → valor no primeiro paint) ────────────────────

function CountUp({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setN(value);
      return;
    }
    const dur = 750;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setN(value * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{format(n)}</span>;
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

// ─── Componente principal ───────────────────────────────────────────────────

const TABS = [
  { id: "resumo", label: "Resumo" },
  { id: "insights", label: "Insights" },
] as const;

export function FinanceiroView(props: FinanceiroViewProps) {
  const [tab, setTab] = useState<"resumo" | "insights">("resumo");
  const [tipo, setTipo] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<{
    titulo: string;
    total: number;
    itens: { nome: string; sub?: string; valor?: number }[];
  } | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function abrir(t: string) {
    setTipo(t);
    setDetalhe(null);
    setCarregando(true);
    try {
      const r = await fetch(`/api/admin/financeiro/detalhe?tipo=${t}&mes=${props.mes}`);
      setDetalhe(await r.json());
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      {/* Segmented control */}
      <div className="relative mb-5 inline-flex rounded-full border border-border bg-muted/50 p-1">
        {TABS.map((t) => {
          const ativo = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative z-10 rounded-full px-5 py-1.5 text-sm font-medium transition-colors",
                ativo ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {ativo && (
                <motion.span
                  layoutId="fin-tab"
                  className="absolute inset-0 -z-10 rounded-full bg-primary shadow-sm"
                  transition={{ type: "spring", stiffness: 480, damping: 36 }}
                />
              )}
              {t.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {tab === "resumo" ? (
          <motion.div
            key="resumo"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <ResumoTab {...props} abrir={abrir} />
          </motion.div>
        ) : (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <InsightsTab {...props} abrir={abrir} />
          </motion.div>
        )}
      </AnimatePresence>

      <AdminModal
        aberto={tipo !== null}
        onFechar={() => setTipo(null)}
        titulo={detalhe?.titulo ?? "Detalhes"}
      >
        {carregando ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !detalhe || detalhe.itens.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nada neste mês.</p>
        ) : (
          <div>
            {detalhe.total > 0 && (
              <div className="mb-3 flex items-baseline justify-between border-b border-border pb-3">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                  {formatarPreco(detalhe.total)}
                </span>
              </div>
            )}
            <ul className="space-y-1.5">
              {detalhe.itens.map((it, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{it.nome}</p>
                    {it.sub && (
                      <p className="truncate text-xs text-muted-foreground">
                        {tipo === "clientes_novos" ? formatarTelefone(it.sub) : it.sub}
                      </p>
                    )}
                  </div>
                  {it.valor !== undefined && it.valor > 0 && (
                    <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-foreground">
                      {formatarPreco(it.valor)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </AdminModal>
    </div>
  );
}

// ─── Tab: Resumo ────────────────────────────────────────────────────────────

function ResumoTab({
  dados,
  serie,
  abrir,
}: FinanceiroViewProps & { abrir: (t: string) => void }) {
  const d = dados.deltas;
  const heroes: {
    rotulo: string;
    valor: number;
    format: (n: number) => string;
    icone: LucideIcon;
    destaque?: boolean;
    hint?: string;
    delta?: Delta;
    tom?: "positivo" | "alerta";
  }[] = [
    { rotulo: "Faturamento", valor: dados.total, format: formatarPreco, icone: Wallet, destaque: true, hint: `${dados.atendimentos} atendimentos`, delta: d?.total },
    { rotulo: "Ticket médio", valor: dados.ticket, format: formatarPreco, icone: TrendingUp, delta: d?.ticket },
    { rotulo: "Atendimentos", valor: dados.atendimentos, format: (n) => String(Math.round(n)), icone: CalendarCheck },
    { rotulo: "Clientes novos", valor: dados.novos, format: (n) => String(Math.round(n)), icone: UserPlus, tom: "positivo", delta: d?.novos },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.05 }}
    >
      {/* Heroes */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
        {heroes.map((h) => {
          const Icone = h.icone;
          return (
            <motion.div
              key={h.rotulo}
              variants={fadeUp}
              className={cn(
                "relative overflow-hidden rounded-2xl border p-4 shadow-xs",
                h.destaque
                  ? "col-span-2 border-primary bg-primary lg:col-span-1"
                  : "border-border bg-card"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-[11px] font-medium uppercase tracking-wide",
                    h.destaque ? "text-primary-foreground/70" : "text-muted-foreground/80"
                  )}
                >
                  {h.rotulo}
                </span>
                <span
                  className={cn(
                    "inline-flex size-7 shrink-0 items-center justify-center rounded-lg",
                    h.destaque
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "bg-muted/70 text-muted-foreground"
                  )}
                >
                  <Icone className="size-3.5" />
                </span>
              </div>
              <CountUp
                value={h.valor}
                format={h.format}
                className={cn(
                  "mt-2 block font-mono font-semibold tabular-nums tracking-tight",
                  h.destaque
                    ? "text-[28px] text-primary-foreground md:text-4xl"
                    : "text-[22px] text-foreground md:text-[26px]"
                )}
              />
              {h.hint && (
                <p
                  className={cn(
                    "mt-0.5 text-[11px]",
                    h.destaque ? "text-primary-foreground/75" : "text-muted-foreground"
                  )}
                >
                  {h.hint}
                </p>
              )}
              {h.delta && (
                <p
                  className={cn(
                    "mt-1 text-[11px] font-medium",
                    h.destaque
                      ? h.delta.positivo
                        ? "text-emerald-300"
                        : "text-primary-foreground/80"
                      : h.delta.positivo
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive"
                  )}
                >
                  {h.delta.texto}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Gráfico principal */}
      <motion.section
        variants={fadeUp}
        className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-xs md:p-5"
      >
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-heading text-base font-semibold tracking-tight text-foreground">
            Movimento financeiro
          </h2>
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {formatarPreco(dados.total)}
          </span>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">Receita por dia · serviços + loja</p>
        <ReceitaBarChart dados={serie} />
      </motion.section>

      {/* Receita por fonte — barras horizontais compactas, clicáveis */}
      <motion.section
        variants={fadeUp}
        className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-xs md:p-5"
      >
        <h2 className="mb-3 font-heading text-base font-semibold tracking-tight text-foreground">
          Receita por fonte
        </h2>
        <FonteBars dados={dados} abrir={abrir} />
      </motion.section>
    </motion.div>
  );
}

const FONTES: { id: string; nome: string; icone: LucideIcon; key: keyof DadosFinanceiro }[] = [
  { id: "servicos", nome: "Serviços", icone: Scissors, key: "servicos" },
  { id: "loja", nome: "Loja", icone: ShoppingBag, key: "loja" },
  { id: "assinaturas", nome: "Assinaturas", icone: Crown, key: "assinaturas" },
  { id: "mensalistas", nome: "Mensalistas", icone: Users, key: "mensalistas" },
];

function FonteBars({
  dados,
  abrir,
}: {
  dados: DadosFinanceiro;
  abrir: (t: string) => void;
}) {
  const linhas = FONTES.map((f) => ({ ...f, valor: dados[f.key] as number })).filter(
    (f) => f.valor > 0
  );
  const total = linhas.reduce((s, l) => s + l.valor, 0);
  if (!total)
    return <p className="py-6 text-center text-sm text-muted-foreground">Sem receita no período.</p>;
  const max = Math.max(...linhas.map((l) => l.valor));

  return (
    <ul className="space-y-2.5">
      {linhas.map((l, i) => {
        const Icone = l.icone;
        const pct = Math.round((l.valor / total) * 100);
        return (
          <li key={l.id}>
            <button
              onClick={() => abrir(l.id)}
              className="group flex w-full items-center gap-3 text-left"
            >
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                <Icone className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{l.nome}</span>
                  <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-foreground">
                    {formatarPreco(l.valor)}
                    <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">{pct}%</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${(l.valor / max) * 100}%` }}
                    transition={{ duration: 0.7, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Tab: Insights ──────────────────────────────────────────────────────────

function InsightsTab({
  dados,
  rankServicos,
  rankProdutos,
  horas,
  dias,
  ocupacao,
  recorrencia,
  abrir,
}: FinanceiroViewProps & { abrir: (t: string) => void }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.06 }}
      className="space-y-4"
    >
      {/* Chips de saúde */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2.5">
        <StatChip
          icone={Gauge}
          rotulo="Ocupação"
          valor={`${Math.round(ocupacao * 100)}%`}
        />
        <StatChip
          icone={Repeat}
          rotulo="Recorrência"
          valor={`${Math.round(recorrencia.taxa * 100)}%`}
          tom="positivo"
        />
        <button onClick={() => abrir("cancelamentos")} className="text-left">
          <StatChip icone={XCircle} rotulo="Cancelados" valor={String(dados.cancelados)} tom="alerta" clicavel />
        </button>
      </motion.div>

      {/* Serviços ranking */}
      <motion.div variants={fadeUp}>
        <RankCard
          titulo="Serviços por receita"
          itens={rankServicos}
          acao={() => abrir("servicos")}
        />
      </motion.div>

      {/* Produtos ranking */}
      <motion.div variants={fadeUp}>
        <RankCard
          titulo="Produtos mais vendidos"
          itens={rankProdutos}
          acao={() => abrir("loja")}
          vazio="Nenhuma venda de loja no período."
        />
      </motion.div>

      {/* Horários + dias fortes */}
      <div className="grid gap-4 sm:grid-cols-2">
        <motion.section
          variants={fadeUp}
          className="rounded-2xl border border-border bg-card p-4 shadow-xs"
        >
          <h3 className="mb-2 font-heading text-sm font-semibold tracking-tight text-foreground">
            Horários fortes
          </h3>
          <MiniBarChart dados={horas.map((h) => ({ rotulo: h.hora.slice(0, 2), total: h.total }))} />
        </motion.section>
        <motion.section
          variants={fadeUp}
          className="rounded-2xl border border-border bg-card p-4 shadow-xs"
        >
          <h3 className="mb-2 font-heading text-sm font-semibold tracking-tight text-foreground">
            Dias fortes
          </h3>
          <MiniBarChart dados={dias.map((x) => ({ rotulo: x.dia, total: x.total }))} />
        </motion.section>
      </div>
    </motion.div>
  );
}

function StatChip({
  icone: Icone,
  rotulo,
  valor,
  tom,
  clicavel,
}: {
  icone: LucideIcon;
  rotulo: string;
  valor: string;
  tom?: "positivo" | "alerta";
  clicavel?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-3 shadow-xs transition-all",
        clicavel && "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
      )}
    >
      <Icone
        className={cn(
          "size-4",
          tom === "positivo"
            ? "text-emerald-600 dark:text-emerald-400"
            : tom === "alerta"
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground"
        )}
      />
      <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-foreground">{valor}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">{rotulo}</p>
    </div>
  );
}

function RankCard({
  titulo,
  itens,
  acao,
  vazio = "Sem dados no período.",
}: {
  titulo: string;
  itens: RankItem[];
  acao?: () => void;
  vazio?: string;
}) {
  const max = Math.max(1, ...itens.map((i) => i.receita));
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-xs md:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-heading text-base font-semibold tracking-tight text-foreground">{titulo}</h3>
        {acao && itens.length > 0 && (
          <button
            onClick={acao}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver tudo <ChevronRight className="size-3.5" />
          </button>
        )}
      </div>
      {itens.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <ul className="space-y-3">
          {itens.slice(0, 5).map((it, i) => (
            <li key={it.nome} className="flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-semibold tabular-nums",
                  i === 0
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{it.nome}</span>
                  <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-foreground">
                    {formatarPreco(it.receita)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${(it.receita / max) * 100}%` }}
                      transition={{ duration: 0.7, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {it.qtd}×
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
