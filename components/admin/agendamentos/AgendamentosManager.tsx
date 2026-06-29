"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Clock,
  Phone,
  Check,
  X,
  UserX,
  RotateCcw,
  CircleDollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { Pill } from "@/components/admin/primitives";
import {
  formatarPreco,
  formatarData,
  formatarTelefone,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Status = "agendado" | "concluido" | "cancelado" | "nao_compareceu";
type Agendamento = {
  id: string;
  data: string;
  horarioInicio: string;
  slots: number;
  status: Status;
  statusPagamento: "pendente" | "pago" | "falhou";
  formaPagamento: string;
  valorTotal: string;
  cliente: { nome: string; telefone: string };
  servicos: { servico: { nome: string } }[];
};

const FILTROS: { id: string; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "agendado", rotulo: "Futuros" },
  { id: "concluido", rotulo: "Concluídos" },
  { id: "cancelado", rotulo: "Cancelados" },
  { id: "nao_compareceu", rotulo: "Faltaram" },
];

const STATUS_META: Record<Status, { rotulo: string; tom: "azul" | "verde" | "vermelho" | "amber" }> = {
  agendado: { rotulo: "Agendado", tom: "azul" },
  concluido: { rotulo: "Concluído", tom: "verde" },
  cancelado: { rotulo: "Cancelado", tom: "vermelho" },
  nao_compareceu: { rotulo: "Não veio", tom: "amber" },
};

export function AgendamentosManager() {
  const params = useSearchParams();
  const statusInicial = params.get("status");
  const [lista, setLista] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState(
    FILTROS.some((f) => f.id === statusInicial) ? statusInicial! : "todos"
  );
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (filtro !== "todos") params.set("status", filtro);
      if (busca.trim()) params.set("q", busca.trim());
      const r = await fetch(`/api/admin/agendamentos?${params}`);
      setLista(await r.json());
    } catch {
      toast.error("Erro ao carregar.");
    } finally {
      setCarregando(false);
    }
  }, [filtro, busca]);

  useEffect(() => {
    const t = setTimeout(carregar, busca ? 300 : 0);
    return () => clearTimeout(t);
  }, [carregar, busca]);

  async function mudarStatus(id: string, patch: Partial<Pick<Agendamento, "status" | "statusPagamento">>) {
    setLista((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
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

  return (
    <div>
      {/* Filtros */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                filtro === f.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome ou telefone…"
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      {carregando ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-[72px] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhum agendamento.
        </p>
      ) : (
        <ul className="space-y-2">
          {lista.map((a) => {
            const meta = STATUS_META[a.status];
            const expandido = aberto === a.id;
            const dia = a.data.slice(0, 10);
            return (
              <motion.li
                key={a.id}
                layout
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs"
              >
                <button
                  onClick={() => setAberto(expandido ? null : a.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <div className="flex flex-col items-center justify-center rounded-xl bg-muted/70 px-3 py-1.5">
                    <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                      {a.horarioInicio}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {formatarData(dia).slice(0, 5)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{a.cliente.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.servicos.map((s) => s.servico.nome).join(", ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                      {formatarPreco(a.valorTotal)}
                    </span>
                    <div className="flex gap-1">
                      <Pill tom={meta.tom}>{meta.rotulo}</Pill>
                      <Pill tom={a.statusPagamento === "pago" ? "verde" : "neutro"}>
                        {a.statusPagamento === "pago" ? "pago" : "pendente"}
                      </Pill>
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {expandido && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border/60"
                    >
                      <div className="space-y-3 p-4">
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Phone className="size-3" /> {formatarTelefone(a.cliente.telefone)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3" /> {a.slots}h · {a.formaPagamento}
                          </span>
                          <span>{formatarData(dia)}</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <AcaoBtn
                            ativo={a.status === "concluido"}
                            onClick={() => mudarStatus(a.id, { status: "concluido" })}
                            icone={Check}
                            label="Concluir"
                            cor="verde"
                          />
                          <AcaoBtn
                            ativo={a.status === "nao_compareceu"}
                            onClick={() => mudarStatus(a.id, { status: "nao_compareceu" })}
                            icone={UserX}
                            label="Faltou"
                            cor="amber"
                          />
                          <AcaoBtn
                            ativo={a.status === "cancelado"}
                            onClick={() => mudarStatus(a.id, { status: "cancelado" })}
                            icone={X}
                            label="Cancelar"
                            cor="vermelho"
                          />
                          <AcaoBtn
                            ativo={a.status === "agendado"}
                            onClick={() => mudarStatus(a.id, { status: "agendado" })}
                            icone={RotateCcw}
                            label="Reabrir"
                            cor="azul"
                          />
                          <div className="ml-auto">
                            <AcaoBtn
                              ativo={a.statusPagamento === "pago"}
                              onClick={() =>
                                mudarStatus(a.id, {
                                  statusPagamento:
                                    a.statusPagamento === "pago" ? "pendente" : "pago",
                                })
                              }
                              icone={CircleDollarSign}
                              label={a.statusPagamento === "pago" ? "Pago ✓" : "Marcar pago"}
                              cor="verde"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AcaoBtn({
  ativo,
  onClick,
  icone: Icone,
  label,
  cor,
}: {
  ativo: boolean;
  onClick: () => void;
  icone: typeof Check;
  label: string;
  cor: "verde" | "amber" | "vermelho" | "azul";
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
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-95",
        ativo ? cores[cor] : "bg-muted/60 text-muted-foreground hover:text-foreground"
      )}
    >
      <Icone className="size-3.5" /> {label}
    </button>
  );
}
