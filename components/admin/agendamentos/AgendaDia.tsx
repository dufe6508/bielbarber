"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Moon,
  Phone,
  RotateCcw,
  Scissors,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Pill } from "@/components/admin/primitives";
import { AdminModal } from "@/components/admin/AdminModal";
import { WhatsAppMenu } from "@/components/WhatsAppMenu";
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

function proximosDias(qtd: number): Date[] {
  const dias: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < qtd; i++) {
    dias.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

export function AgendaDia() {
  const [data, setData] = useState(() => dataISOLocal(new Date()));
  const [horarios, setHorarios] = useState<string[]>([]);
  const [ags, setAgs] = useState<Ag[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [alvo, setAlvo] = useState<Ag | null>(null);

  // Estado da remarcação inline
  const [remarcando, setRemarcando] = useState(false);
  const [novaData, setNovaData] = useState<string | null>(null);
  const [novoHorario, setNovoHorario] = useState<string | null>(null);
  const [remarcandoLoading, setRemarcandoLoading] = useState(false);

  const diasRemarcar = proximosDias(21);

  const { data: slotsRemarcar, isLoading: carregandoSlots } = useQuery<string[]>({
    queryKey: ["admin-slots-remarcar", novaData],
    queryFn: async () => {
      const res = await fetch(`/api/slots?data=${novaData}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!novaData && remarcando,
  });

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

  function fecharModal() {
    setAlvo(null);
    setRemarcando(false);
    setNovaData(null);
    setNovoHorario(null);
  }

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

  async function confirmarRemarcacao() {
    if (!alvo || !novaData || !novoHorario) return;
    setRemarcandoLoading(true);
    try {
      const res = await fetch(`/api/admin/agendamentos/${alvo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: novaData, horarioInicio: novoHorario }),
      });
      if (!res.ok) throw new Error();
      toast.success("Agendamento remarcado.");
      fecharModal();
      carregar();
    } catch {
      toast.error("Erro ao remarcar.");
    } finally {
      setRemarcandoLoading(false);
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
  // Data curta (30/06) para as mensagens de WhatsApp.
  const dataCurta = (() => {
    const [, m, d] = data.split("-");
    return `${d}/${m}`;
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
                  <span className="w-12 shrink-0 pt-2.5 text-right font-mono text-xs font-medium tabular-nums text-muted-foreground">
                    {h}
                  </span>
                  {ag ? (
                    <button
                      onClick={() => setAlvo(ag)}
                      className="flex flex-1 flex-col gap-1 overflow-hidden rounded-xl border border-border bg-card px-3 py-2 text-left shadow-xs transition-all hover:bg-muted/40 hover:shadow-sm active:scale-[0.99]"
                    >
                      {/* Linha 1: nome + valor */}
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-foreground">
                          {ag.cliente.nome}
                        </p>
                        <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-foreground">
                          {formatarPreco(ag.valorTotal)}
                        </span>
                      </div>

                      {/* Linha 2: serviço/telefone + status */}
                      <div className="flex items-center gap-2">
                        <Scissors className="size-3 shrink-0 text-muted-foreground" />
                        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                          {ag.servicos.join(", ")}
                          <span className="mx-1 text-muted-foreground/40">·</span>
                          {formatarTelefone(ag.cliente.telefone)}
                        </p>
                        <div className="flex shrink-0 items-center gap-1">
                          {ag.slots >= 2 && <Pill tom="neutro">2h</Pill>}
                          <Pill tom={STATUS_TOM[ag.status] ?? "neutro"}>
                            {STATUS_ROTULO[ag.status] ?? ag.status}
                          </Pill>
                          <Pill tom={ag.statusPagamento === "pago" ? "verde" : "neutro"}>
                            {ag.statusPagamento === "pago" ? "pago" : "pendente"}
                          </Pill>
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div
                      className={cn(
                        "flex flex-1 items-center rounded-xl border border-dashed px-3 py-2.5 text-xs",
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

      {/* Modal de ações */}
      <AdminModal
        aberto={alvo !== null}
        onFechar={fecharModal}
        titulo={alvo?.cliente.nome ?? "Agendamento"}
        largura="max-w-md"
      >
        {alvo && (
          <div className="space-y-4">
            {/* Resumo do agendamento */}
            <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Serviços
                  </p>
                  <p className="mt-1 text-sm font-medium leading-snug text-foreground">
                    {alvo.servicos.join(", ")}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-2xl font-bold tabular-nums text-foreground">
                  {formatarPreco(alvo.valorTotal)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 shrink-0" />
                  {alvo.horarioInicio}
                  {alvo.slots >= 2 && <span className="text-muted-foreground/60">· {alvo.slots}h</span>}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0" />
                  {formatarTelefone(alvo.cliente.telefone)}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 border-t border-border/50 pt-3">
                {alvo.slots >= 2 && <Pill tom="neutro">2h</Pill>}
                <Pill tom={STATUS_TOM[alvo.status] ?? "neutro"}>
                  {STATUS_ROTULO[alvo.status] ?? alvo.status}
                </Pill>
                <Pill tom={alvo.statusPagamento === "pago" ? "verde" : "neutro"}>
                  {alvo.statusPagamento === "pago" ? "pago" : "pendente"}
                </Pill>
              </div>
            </div>

            {/* WhatsApp — mensagens prontas para o cliente */}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <span className="text-xs text-muted-foreground">Avisar o cliente</span>
              <WhatsAppMenu
                telefone={alvo.cliente.telefone}
                rotulo="WhatsApp"
                align="right"
                vars={{
                  nome: alvo.cliente.nome,
                  data: dataCurta,
                  hora: alvo.horarioInicio,
                  servico: alvo.servicos.join(", "),
                }}
                templates={[
                  "confirmar_agendamento",
                  "agendamento_realizado",
                  "lembrete",
                  "remarcado",
                  "cancelamento",
                ]}
              />
            </div>

            {/* Status do atendimento */}
            <div>
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Status do atendimento
              </p>
              <div className="grid grid-cols-2 gap-2">
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
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Pagamento
                </p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {alvo.statusPagamento === "pago" ? "Quitado" : "Em aberto"}
                </p>
              </div>
              <button
                onClick={() =>
                  mudarStatus(alvo.id, {
                    statusPagamento: alvo.statusPagamento === "pago" ? "pendente" : "pago",
                  })
                }
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-semibold transition-all active:scale-95",
                  alvo.statusPagamento === "pago"
                    ? "bg-emerald-500/12 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {alvo.statusPagamento === "pago" ? "Pago ✓" : "Marcar pago"}
              </button>
            </div>

            {/* Remarcar horário */}
            <AnimatePresence mode="wait">
              {!remarcando ? (
                <motion.button
                  key="btn-remarcar"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setRemarcando(true)}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground transition-colors hover:bg-muted/40 active:scale-[0.99]"
                >
                  <span className="flex items-center gap-2.5 font-medium">
                    <CalendarClock className="size-4 text-muted-foreground" />
                    Remarcar horário
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </motion.button>
              ) : (
                <motion.div
                  key="form-remarcar"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">Novo horário</p>
                      <button
                        onClick={() => {
                          setRemarcando(false);
                          setNovaData(null);
                          setNovoHorario(null);
                        }}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Fechar remarcação"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    {/* Dias */}
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {diasRemarcar.map((d) => {
                        const iso = dataISOLocal(d);
                        const ativo = novaData === iso;
                        const dow = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
                        const dia = String(d.getDate()).padStart(2, "0");
                        const hoje = rotuloRelativo(d) === "Hoje";
                        return (
                          <button
                            key={iso}
                            type="button"
                            onClick={() => {
                              setNovaData(iso);
                              setNovoHorario(null);
                            }}
                            className={cn(
                              "flex min-w-[52px] shrink-0 flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-[11px] transition-colors",
                              ativo
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-foreground hover:border-primary/40",
                              hoje && !ativo && "border-primary/30"
                            )}
                          >
                            <span className="uppercase tracking-wide opacity-75">{dow}</span>
                            <span className="font-mono text-sm font-bold tabular-nums">{dia}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Horários */}
                    {novaData && (
                      carregandoSlots ? (
                        <div className="grid grid-cols-4 gap-2">
                          {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                          ))}
                        </div>
                      ) : slotsRemarcar && slotsRemarcar.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                          {slotsRemarcar.map((h) => (
                            <button
                              key={h}
                              type="button"
                              onClick={() => setNovoHorario(h)}
                              className={cn(
                                "h-10 rounded-lg border font-mono text-sm font-medium tabular-nums transition-colors",
                                novoHorario === h
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-card text-foreground hover:border-primary/40"
                              )}
                            >
                              {h}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-sm text-muted-foreground">
                          Sem horários nesse dia.
                        </p>
                      )
                    )}

                    <button
                      type="button"
                      disabled={!novaData || !novoHorario || remarcandoLoading}
                      onClick={confirmarRemarcacao}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40"
                    >
                      {remarcandoLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Confirmar remarcação"
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
        "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-all active:scale-95",
        largura,
        ativo ? cores[cor] : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icone className="size-4 shrink-0" />
      {label}
    </button>
  );
}
