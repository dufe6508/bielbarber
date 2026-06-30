"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Wallet, Scissors, TrendingUp, XCircle } from "lucide-react";
import type { ResumoFinanceiro } from "@/lib/admin/metrics";
import { formatarPreco } from "@/lib/utils/format";
import { CollapsibleCard } from "@/components/admin/CollapsibleCard";
import { cn } from "@/lib/utils";

type Periodo = "dia" | "semana" | "mes";

const ABAS: { id: Periodo; rotulo: string }[] = [
  { id: "dia", rotulo: "Dia" },
  { id: "semana", rotulo: "Semana" },
  { id: "mes", rotulo: "Mês" },
];

// Resumo financeiro retrátil com alternância Dia / Semana / Mês. Fica recolhido
// por padrão (só o total do dia aparece no cabeçalho) e expande sob demanda —
// informação disponível sem poluir a tela. Os três períodos vêm pré-calculados
// do servidor, então alternar é instantâneo.
export function ResumoFinanceiroCard({
  dia,
  semana,
  mes,
}: {
  dia: ResumoFinanceiro;
  semana: ResumoFinanceiro;
  mes: ResumoFinanceiro;
}) {
  const [aba, setAba] = useState<Periodo>("dia");
  const dados = aba === "dia" ? dia : aba === "semana" ? semana : mes;

  return (
    <CollapsibleCard
      titulo="Resumo financeiro"
      subtitulo="Dia · semana · mês"
      icone={<Wallet className="size-4" />}
      resumo={
        <span className="font-mono font-semibold tabular-nums text-foreground">
          {formatarPreco(dia.total)}
        </span>
      }
      defaultOpen={false}
    >
      {/* Segmented control */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-border bg-muted/40 p-0.5">
          {ABAS.map((t) => {
            const on = aba === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setAba(t.id)}
                className={cn(
                  "relative rounded-full px-3.5 py-1 text-xs font-medium transition-colors",
                  on ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {on && (
                  <motion.span
                    layoutId="resumo-fin-aba"
                    className="absolute inset-0 rounded-full bg-primary"
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                  />
                )}
                <span className="relative">{t.rotulo}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Faturamento total — número grande */}
      <div className="mt-4 text-center">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
          Faturamento {aba === "dia" ? "de hoje" : aba === "semana" ? "da semana" : "do mês"}
        </p>
        <motion.p
          key={aba}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-1 font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground md:text-4xl"
        >
          {formatarPreco(dados.total)}
        </motion.p>
      </div>

      {/* Mini-métricas */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <Mini icone={Scissors} rotulo="Atendimentos" valor={String(dados.atendimentos)} />
        <Mini icone={TrendingUp} rotulo="Ticket médio" valor={formatarPreco(dados.ticket)} />
        <Mini
          icone={XCircle}
          rotulo="Cancelados"
          valor={String(dados.cancelados)}
          alerta={dados.cancelados > 0}
        />
      </div>

      {/* Quebra por fonte (só mostra fontes com valor) */}
      {dados.total > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
          <Fonte rotulo="Serviços" valor={dados.servicos} />
          <Fonte rotulo="Loja" valor={dados.loja} />
          <Fonte rotulo="Pacotes" valor={dados.assinaturas} />
          <Fonte rotulo="Mensalistas" valor={dados.mensalistas} />
        </div>
      )}
    </CollapsibleCard>
  );
}

function Mini({
  icone: Icone,
  rotulo,
  valor,
  alerta,
}: {
  icone: typeof Wallet;
  rotulo: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
      <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
        <Icone className="size-3" />
        {rotulo}
      </span>
      <p
        className={cn(
          "mt-1 font-mono text-base font-semibold tabular-nums",
          alerta ? "text-amber-600 dark:text-amber-400" : "text-foreground"
        )}
      >
        {valor}
      </p>
    </div>
  );
}

function Fonte({ rotulo, valor }: { rotulo: string; valor: number }) {
  if (valor <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
      {rotulo}
      <span className="font-mono font-semibold tabular-nums text-foreground">
        {formatarPreco(valor)}
      </span>
    </span>
  );
}
