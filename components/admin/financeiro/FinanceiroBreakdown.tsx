"use client";

import { useState } from "react";
import {
  Wallet,
  Scissors,
  ShoppingBag,
  Crown,
  Users,
  TrendingUp,
  XCircle,
  UserPlus,
  Loader2,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { AdminModal } from "@/components/admin/AdminModal";
import { formatarPreco, formatarTelefone } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

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
};

type Detalhe = {
  titulo: string;
  total: number;
  itens: { nome: string; sub?: string; valor?: number; qtd?: number }[];
};

export function FinanceiroBreakdown({
  mes,
  dados,
}: {
  mes: string;
  dados: DadosFinanceiro;
}) {
  const [tipo, setTipo] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function abrir(t: string) {
    setTipo(t);
    setDetalhe(null);
    setCarregando(true);
    try {
      const r = await fetch(`/api/admin/financeiro/detalhe?tipo=${t}&mes=${mes}`);
      setDetalhe(await r.json());
    } finally {
      setCarregando(false);
    }
  }

  const cards: {
    id?: string;
    rotulo: string;
    valor: string;
    icone: LucideIcon;
    hint?: string;
    destaque?: boolean;
    tom?: "positivo" | "alerta";
  }[] = [
    {
      rotulo: "Faturamento bruto",
      valor: formatarPreco(dados.total),
      icone: Wallet,
      hint: `${dados.atendimentos} atendimentos`,
      destaque: true,
    },
    { id: "servicos", rotulo: "Serviços", valor: formatarPreco(dados.servicos), icone: Scissors },
    { id: "loja", rotulo: "Loja", valor: formatarPreco(dados.loja), icone: ShoppingBag },
    { id: "assinaturas", rotulo: "Assinaturas", valor: formatarPreco(dados.assinaturas), icone: Crown },
    { id: "mensalistas", rotulo: "Mensalistas", valor: formatarPreco(dados.mensalistas), icone: Users },
    { rotulo: "Ticket médio", valor: formatarPreco(dados.ticket), icone: TrendingUp },
    { id: "cancelamentos", rotulo: "Cancelamentos", valor: String(dados.cancelados), icone: XCircle, tom: "alerta" },
    { id: "clientes_novos", rotulo: "Clientes novos", valor: String(dados.novos), icone: UserPlus, tom: "positivo" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
        {cards.map((c, i) => {
          const Icone = c.icone;
          const clicavel = !!c.id;
          const inner = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-[11px] font-medium uppercase tracking-wide",
                    c.destaque ? "text-primary-foreground/70" : "text-muted-foreground/80"
                  )}
                >
                  {c.rotulo}
                </span>
                <span
                  className={cn(
                    "inline-flex size-7 shrink-0 items-center justify-center rounded-lg",
                    c.destaque
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "bg-muted/70 text-muted-foreground"
                  )}
                >
                  <Icone className="size-3.5" />
                </span>
              </div>
              <p
                className={cn(
                  "mt-2 font-mono font-semibold tabular-nums tracking-tight",
                  c.destaque ? "text-3xl text-primary-foreground md:text-4xl" : "text-[22px] text-foreground md:text-[26px]"
                )}
              >
                {c.valor}
              </p>
              {c.hint && (
                <p
                  className={cn(
                    "mt-0.5 text-[11px]",
                    c.destaque && "text-primary-foreground/75",
                    !c.destaque && c.tom === "positivo" && "text-emerald-600 dark:text-emerald-400",
                    !c.destaque && c.tom === "alerta" && "text-amber-600 dark:text-amber-400",
                    !c.destaque && !c.tom && "text-muted-foreground"
                  )}
                >
                  {c.hint}
                </p>
              )}
              {clicavel && (
                <ChevronRight className="absolute right-3 top-3 size-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
              )}
            </>
          );
          const base = cn(
            "group relative block rounded-2xl border p-4 text-left shadow-xs transition-all md:p-5",
            c.destaque ? "border-primary bg-primary col-span-2 lg:col-span-1" : "border-border bg-card",
            clicavel && "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:translate-y-0"
          );
          return clicavel ? (
            <button key={i} onClick={() => abrir(c.id!)} className={base}>
              {inner}
            </button>
          ) : (
            <div key={i} className={base}>
              {inner}
            </div>
          );
        })}
      </div>

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
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nada neste mês.
          </p>
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
    </>
  );
}
