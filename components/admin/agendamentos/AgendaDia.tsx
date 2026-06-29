"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Phone,
  Moon,
  Info,
  Scissors,
  Check,
  X,
  UserX,
  RotateCcw,
  CircleDollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { Pill } from "@/components/admin/primitives";
import { AdminModal } from "@/components/admin/AdminModal";
import {
  formatarPreco,
  formatarTelefone,
  dataISOLocal,
  rotuloRelativo,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Ag = {
  id: string;
  horarioInicio: string;
  slots: number;
  status: string;
  statusPagamento: string;
  valorTotal: string;
  cliente: { nome: string; telefone: string };
  servicos: string[];
};

const STATUS_TOM: Record<string, "azul" | "verde" | "amber"> = {
  agendado: "azul",
  concluido: "verde",
  nao_compareceu: "amber",
};

const STATUS_ROTULO: Record<string, string> = {
  agendado: "agendado",
  concluido: "concluído",
  nao_compareceu: "faltou",
  cancelado: "cancelado",
};

function proxima(h: string) {
  return `${String(Number(h.split(":")[0]) + 1).padStart(2, "0")}:00`;
}

export function AgendaDia() {
  const [data, setData] = useState(() => dataISOLocal(new Date()));
  const [horarios, setHorarios] = useState<string[]>([]);
  const [ags, setAgs] = useState<Ag[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [alvo, setAlvo] = useState<Ag | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch(`/api/admin/agenda-dia?data=${data}`);
      const j = await r.json();
      setHorarios(j.horarios ?? []);
      setAgs(j.agendamentos ?? []);
    } finally {
      setCarregando(false);
    }
  }, [data]);

  useEffect(() => {
    const t = setTimeout(carregar, 0);
    return () => clearTimeout(t);
  }, [carregar]);

  async function mudarStatus(
    id: string,
    patch: Partial<Pick<Ag, "status" | "statusPagamento">>
  ) {
    setAgs((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    setAlvo((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
    const res = await fetch(`/api/admin/agendamentos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error("Erro ao atualizar.");
      carregar();
    }
  }

  function mover(dias: number) {
    const [a, m, d] = data.split("-").map(Number);
    const nova = new Date(a, m - 1, d + dias);
    setData(dataISOLocal(nova));
  }

  const porHora = new Map<string, Ag>();
  const segundaParte = new Set<string>();
  for (const a of ags) {
    porHora.set(a.horarioInicio, a);
    if (a.slots >= 2) segundaParte.add(proxima(a.horarioInicio));
  }

  const dataLabel = (() => {
    const [a, m, d] = data.split("-").map(Number);
    return new Date(a, m - 1, d).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  })();

  const totalDia = ags
    .filter((a) => a.status !== "cancelado")
    .reduce((s, a) => s + Number(a.valorTotal), 0);

  return (
    <div>
      {/* Navegador de dia */}
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-2.5">
        <button
          onClick={() => mover(-1)}
          className="inline-flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Dia anterior"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-semibold capitalize text-foreground">
            {rotuloRelativo(data) === "Hoje" ? "Hoje · " : ""}
            {dataLabel}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {ags.length} agend. · {formatarPreco(totalDia)}
          </p>
        </div>
        <button
          onClick={() => mover(1)}
          className="inline-flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Próximo dia"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {carregando ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : horarios.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center">
          <Moon className="size-7 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">Dia fechado, sem atendimento.</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.ul
            key={data}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            {horarios.map((h) => {
              const ag = porHora.get(h);
              const ehSegunda = segundaParte.has(h) && !ag;
              return (
                <li key={h} className="flex gap-3">
                  <span className="w-12 shrink-0 pt-3 text-right font-mono text-xs font-medium tabular-nums text-muted-foreground">
                    {h}
                  </span>
                  {ag ? (
                    <button
                      onClick={() => setAlvo(ag)}
                      className="flex-1 rounded-xl border border-border bg-card p-3 text-left shadow-xs transition-colors hover:bg-muted/40 active:scale-[0.99]"
                    >
                      {/* Topo: nome + (i) */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                          {ag.cliente.nome}
                        </p>
                        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted/70 text-muted-foreground">
                          <Info className="size-3.5" />
                        </span>
                      </div>

                      {/* Serviços */}
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Scissors className="size-3 shrink-0" />
                        {ag.servicos.join(", ")}
                      </p>

                      {/* Telefone */}
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Phone className="size-3 shrink-0" />
                        {formatarTelefone(ag.cliente.telefone)}
                      </p>

                      {/* Rodapé: valor + status */}
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                        <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                          {formatarPreco(ag.valorTotal)}
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                          <Pill tom={STATUS_TOM[ag.status] ?? "neutro"}>
                            {STATUS_ROTULO[ag.status] ?? ag.status}
                          </Pill>
                          {ag.slots >= 2 && <Pill tom="neutro">2h</Pill>}
                          <Pill tom={ag.statusPagamento === "pago" ? "verde" : "neutro"}>
                            {ag.statusPagamento === "pago" ? "pago" : "pendente"}
                          </Pill>
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div
                      className={cn(
                        "flex flex-1 items-center rounded-xl border border-dashed px-3 py-3 text-xs",
                        ehSegunda
                          ? "border-border bg-muted/40 text-muted-foreground"
                          : "border-border/60 text-muted-foreground/60"
                      )}
                    >
                      {ehSegunda ? "Continuação (2ª hora)" : "Livre"}
                    </div>
                  )}
                </li>
              );
            })}
          </motion.ul>
        </AnimatePresence>
      )}

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70">
        <CalendarDays className="size-3" />
        Os horários seguem sua rotina semanal e os ajustes de cada dia.
      </p>

      {/* Modal de ações do agendamento */}
      <AdminModal
        aberto={alvo !== null}
        onFechar={() => setAlvo(null)}
        titulo={alvo?.cliente.nome ?? "Agendamento"}
        largura="max-w-md"
      >
        {alvo && (
          <div className="space-y-4">
            {/* Resumo */}
            <div className="rounded-xl border border-border/60 bg-background p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                  {formatarPreco(alvo.valorTotal)}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-sm text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  {alvo.horarioInicio}
                  {alvo.slots >= 2 ? ` · ${alvo.slots}h` : ""}
                </span>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-foreground">
                <Scissors className="size-3.5 shrink-0 text-muted-foreground" />
                {alvo.servicos.join(", ")}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="size-3 shrink-0" />
                {formatarTelefone(alvo.cliente.telefone)}
              </p>
            </div>

            {/* Status */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
                Status do atendimento
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <AcaoBtn
                  ativo={alvo.status === "concluido"}
                  onClick={() => mudarStatus(alvo.id, { status: "concluido" })}
                  icone={Check}
                  label="Concluir"
                  cor="verde"
                />
                <AcaoBtn
                  ativo={alvo.status === "nao_compareceu"}
                  onClick={() => mudarStatus(alvo.id, { status: "nao_compareceu" })}
                  icone={UserX}
                  label="Faltou"
                  cor="amber"
                />
                <AcaoBtn
                  ativo={alvo.status === "cancelado"}
                  onClick={() => mudarStatus(alvo.id, { status: "cancelado" })}
                  icone={X}
                  label="Cancelar"
                  cor="vermelho"
                />
                <AcaoBtn
                  ativo={alvo.status === "agendado"}
                  onClick={() => mudarStatus(alvo.id, { status: "agendado" })}
                  icone={RotateCcw}
                  label="Reabrir"
                  cor="azul"
                />
              </div>
            </div>

            {/* Pagamento */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
                Pagamento
              </p>
              <AcaoBtn
                ativo={alvo.statusPagamento === "pago"}
                onClick={() =>
                  mudarStatus(alvo.id, {
                    statusPagamento: alvo.statusPagamento === "pago" ? "pendente" : "pago",
                  })
                }
                icone={CircleDollarSign}
                label={alvo.statusPagamento === "pago" ? "Pago ✓" : "Marcar como pago"}
                cor="verde"
                largura="w-full"
              />
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}

function AcaoBtn({
  ativo,
  onClick,
  icone: Icone,
  label,
  cor,
  largura,
}: {
  ativo: boolean;
  onClick: () => void;
  icone: typeof Check;
  label: string;
  cor: "verde" | "amber" | "vermelho" | "azul";
  largura?: string;
}) {
  const cores: Record<string, string> = {
    verde: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20",
    amber: "bg-amber-500/12 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20",
    vermelho: "bg-red-500/12 text-red-700 dark:text-red-400 hover:bg-red-500/20",
    azul: "bg-blue-500/12 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all active:scale-95",
        largura,
        ativo ? cores[cor] : "bg-muted/60 text-muted-foreground hover:text-foreground"
      )}
    >
      <Icone className="size-4" /> {label}
    </button>
  );
}
