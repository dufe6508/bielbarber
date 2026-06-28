"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarOff,
  CalendarRange,
  Check,
  Loader2,
  Lock,
  Moon,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatarData } from "@/lib/utils/format";
import { CollapsibleCard } from "@/components/admin/CollapsibleCard";
import { MiniCalendar } from "@/components/admin/MiniCalendar";

const GRADE = Array.from({ length: 15 }, (_, i) => `${String(8 + i).padStart(2, "0")}:00`);

type Excecao = {
  id: string;
  data: string;
  tipo: "fechado" | "horarios";
  horarios: string[];
  motivo: string | null;
};

type DiaInfo = {
  base: string[];
  efetivos: string[];
  ocupados: string[];
  fechado: boolean;
  temExcecao: boolean;
  motivo: string;
};

function diaISO(iso: string) {
  return iso.slice(0, 10);
}
function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function mesmoConjunto(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}
function periodoDe(h: string): "manha" | "tarde" | "noite" {
  const n = Number(h.split(":")[0]);
  if (n < 12) return "manha";
  if (n < 18) return "tarde";
  return "noite";
}
function labelDia(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export function AgendaExcecoes() {
  const [lista, setLista] = useState<Excecao[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);

  const [diaSel, setDiaSel] = useState<string | null>(null);
  const [calAberto, setCalAberto] = useState(true);
  const [info, setInfo] = useState<DiaInfo | null>(null);
  const [carregandoDia, setCarregandoDia] = useState(false);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregarLista = useCallback(async () => {
    setCarregandoLista(true);
    try {
      const r = await fetch("/api/admin/excecoes");
      setLista(await r.json());
    } catch {
      toast.error("Não consegui carregar os ajustes.");
    } finally {
      setCarregandoLista(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(carregarLista, 0);
    return () => clearTimeout(t);
  }, [carregarLista]);

  // Dias que já têm ajuste — marcados no calendário
  const diasComAjuste = useMemo(
    () => new Set(lista.map((e) => diaISO(e.data))),
    [lista]
  );

  const selecionarDia = useCallback(async (iso: string) => {
    setDiaSel(iso);
    setCalAberto(false); // escolheu o dia → recolhe o calendário, foco no editor
    setInfo(null);
    setCarregandoDia(true);
    try {
      const r = await fetch(`/api/admin/excecao-dia?data=${iso}`);
      const j: DiaInfo = await r.json();
      setInfo(j);
      setAbertos(new Set(j.fechado ? [] : j.efetivos));
      setMotivo(j.motivo ?? "");
    } catch {
      toast.error("Erro ao abrir o dia.");
    } finally {
      setCarregandoDia(false);
    }
  }, []);

  function fecharEditor() {
    setDiaSel(null);
    setInfo(null);
  }

  // Conjunto de chips: dia de folga abre a grade toda (pode abrir qualquer hora);
  // dia de trabalho usa a base ∪ horas já abertas por exceção.
  const chips = useMemo(() => {
    if (!info) return [];
    if (info.base.length === 0) return GRADE;
    return [...new Set([...info.base, ...info.efetivos])].sort();
  }, [info]);

  const ocupadosSet = useMemo(
    () => new Set(info?.ocupados ?? []),
    [info]
  );

  function alternar(h: string) {
    if (ocupadosSet.has(h)) return; // ocupado não pode ser bloqueado
    setAbertos((prev) => {
      const n = new Set(prev);
      if (n.has(h)) n.delete(h);
      else n.add(h);
      return n;
    });
  }

  function bloquearPeriodo(p: "manha" | "tarde" | "noite") {
    setAbertos((prev) => {
      const n = new Set(prev);
      for (const h of chips) {
        if (periodoDe(h) === p && !ocupadosSet.has(h)) n.delete(h);
      }
      return n;
    });
  }
  function liberarTudo() {
    setAbertos(new Set(chips));
  }
  function fecharDiaTodo() {
    // mantém ocupados? não — fechar o dia exige que não haja ocupados
    setAbertos(new Set());
  }

  const ehFolga = info ? info.base.length === 0 : false;
  const totalAbertos = abertos.size;
  const temOcupado = (info?.ocupados.length ?? 0) > 0;

  // Houve mudança em relação ao estado salvo?
  const alterado = useMemo(() => {
    if (!info) return false;
    const salvo = info.fechado ? [] : info.efetivos;
    if (!mesmoConjunto([...abertos], salvo)) return true;
    return motivo !== info.motivo;
  }, [info, abertos, motivo]);

  async function salvar() {
    if (!diaSel) return;
    if (totalAbertos === 0 && temOcupado) {
      toast.error("Há agendamentos nesse dia. Cancele antes de fechar.");
      return;
    }
    setSalvando(true);
    try {
      // Voltou ao padrão (rotina semanal) e sem motivo → remove o ajuste em vez
      // de guardar um override redundante. Dia de folga "fechado" também é padrão.
      const voltouAoPadrao =
        !motivo.trim() &&
        ((!ehFolga && totalAbertos > 0 && mesmoConjunto([...abertos], info!.base)) ||
          (ehFolga && totalAbertos === 0));

      if (voltouAoPadrao) {
        await fetch("/api/admin/excecoes", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: diaSel }),
        });
      } else {
        const tipo = totalAbertos === 0 ? "fechado" : "horarios";
        const res = await fetch("/api/admin/excecoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: diaSel,
            tipo,
            horarios: [...abertos].sort(),
            motivo,
          }),
        });
        if (!res.ok) throw new Error();
      }
      toast.success("Dia ajustado.");
      await carregarLista();
      await selecionarDia(diaSel); // recarrega estado salvo
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function removerAjuste(iso: string) {
    try {
      await fetch("/api/admin/excecoes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: iso }),
      });
      setLista((prev) => prev.filter((e) => diaISO(e.data) !== iso));
      toast.success("Ajuste removido.");
      if (diaSel === iso) await selecionarDia(iso);
    } catch {
      toast.error("Erro ao remover.");
    }
  }

  const periodosPresentes = useMemo(() => {
    const set = new Set(chips.map(periodoDe));
    return (["manha", "tarde", "noite"] as const).filter((p) => set.has(p));
  }, [chips]);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Toque num dia e ajuste hora a hora. Vale só para aquela data.
      </p>

      {/* Calendário retrátil */}
      <CollapsibleCard
        titulo="Escolha um dia"
        icone={<CalendarRange className="size-4" />}
        resumo={diaSel ? labelDia(diaSel) : undefined}
        open={calAberto}
        onOpenChange={setCalAberto}
        className="mx-auto max-w-sm"
      >
        <div className="mx-auto max-w-[320px]">
          <div className="rounded-2xl bg-gradient-to-b from-card to-card/30 p-3 ring-1 ring-inset ring-border/50 shadow-[0_1px_2px_color-mix(in_oklch,var(--foreground)_6%,transparent)]">
            <MiniCalendar
              selected={diaSel}
              onSelect={selecionarDia}
              min={hojeISO()}
              marcados={(iso) => diasComAjuste.has(iso)}
            />
          </div>
          {diasComAjuste.size > 0 && (
            <div className="mt-2.5 flex items-center justify-center text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-foreground ring-2 ring-card" /> dias ajustados
              </span>
            </div>
          )}
        </div>
      </CollapsibleCard>

      {/* Editor do dia */}
      <AnimatePresence mode="wait">
        {diaSel && (
          <motion.div
            key={diaSel}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <h3 className="font-heading text-base font-semibold capitalize tracking-tight text-foreground">
                  {labelDia(diaSel)}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {carregandoDia
                    ? "Carregando…"
                    : totalAbertos === 0
                    ? "Fechado o dia todo"
                    : `${totalAbertos} ${totalAbertos === 1 ? "horário aberto" : "horários abertos"}`}
                  {ehFolga && " · normalmente é folga"}
                </p>
              </div>
              <button
                onClick={fecharEditor}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>

            {carregandoDia || !info ? (
              <div className="space-y-3 p-5">
                <div className="h-8 w-2/3 animate-pulse rounded-lg bg-muted" />
                <div className="flex flex-wrap gap-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-9 w-[58px] animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-5">
                {/* Atalhos de período */}
                {totalAbertos > 0 && periodosPresentes.length > 1 && (
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Bloquear:</span>
                    {periodosPresentes.map((p) => (
                      <button
                        key={p}
                        onClick={() => bloquearPeriodo(p)}
                        className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                      >
                        {p === "manha" ? "Manhã" : p === "tarde" ? "Tarde" : "Noite"}
                      </button>
                    ))}
                  </div>
                )}

                {/* Chips de hora */}
                <motion.div
                  className="flex flex-wrap gap-2"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.015 } },
                  }}
                >
                  {chips.map((h) => {
                    const ocupado = ocupadosSet.has(h);
                    const aberto = abertos.has(h);
                    return (
                      <motion.button
                        key={h}
                        type="button"
                        onClick={() => alternar(h)}
                        disabled={ocupado}
                        whileTap={ocupado ? undefined : { scale: 0.9 }}
                        variants={{
                          hidden: { opacity: 0, scale: 0.85 },
                          show: { opacity: 1, scale: 1 },
                        }}
                        title={
                          ocupado
                            ? "Há agendamento neste horário"
                            : aberto
                            ? "Aberto — toque para bloquear"
                            : "Bloqueado — toque para abrir"
                        }
                        className={cn(
                          "relative flex h-9 w-[58px] items-center justify-center gap-1 rounded-lg border font-mono text-[13px] font-medium tabular-nums transition-colors",
                          ocupado
                            ? "cursor-not-allowed border-primary/30 bg-primary/10 text-primary"
                            : aberto
                            ? "border-primary bg-primary text-primary-foreground shadow-xs"
                            : "border-dashed border-border bg-card text-muted-foreground/50 line-through hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {ocupado && <Lock className="size-2.5" />}
                        {h}
                      </motion.button>
                    );
                  })}
                </motion.div>

                {/* Legenda */}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-primary" /> aberto
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm border border-dashed border-border" /> bloqueado
                  </span>
                  {temOcupado && (
                    <span className="inline-flex items-center gap-1.5">
                      <Lock className="size-2.5 text-primary" /> ocupado
                    </span>
                  )}
                </div>

                {/* Motivo */}
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Motivo (opcional): feriado, viagem…"
                  className="mt-4 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                />

                {/* Ações */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={salvar}
                    disabled={!alterado || salvando}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                  >
                    {salvando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    Salvar
                  </button>
                  {totalAbertos > 0 ? (
                    <button
                      onClick={fecharDiaTodo}
                      disabled={temOcupado}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-40"
                      title={temOcupado ? "Cancele os agendamentos primeiro" : undefined}
                    >
                      <CalendarOff className="size-3.5" />
                      Fechar o dia
                    </button>
                  ) : (
                    <button
                      onClick={liberarTudo}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Reabrir horários
                    </button>
                  )}
                  {info.temExcecao && (
                    <button
                      onClick={() => removerAjuste(diaSel)}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-medium text-muted-foreground/70 transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                      Remover ajuste
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de ajustes existentes */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Ajustes marcados
        </h4>
        {carregandoLista ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : lista.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            Nenhum ajuste por aqui. Sua rotina semanal está valendo.
          </p>
        ) : (
          <ul className="space-y-2">
            {lista.map((e) => {
              const iso = diaISO(e.data);
              const ativo = diaSel === iso;
              return (
                <li
                  key={e.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 transition-colors",
                    ativo ? "border-primary/40" : "border-border"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                      e.tipo === "fechado"
                        ? "bg-destructive/12 text-destructive"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {e.tipo === "fechado" ? (
                      <Moon className="size-4" />
                    ) : (
                      <CalendarRange className="size-4" />
                    )}
                  </span>
                  <button
                    onClick={() => selecionarDia(iso)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium text-foreground">
                      {formatarData(iso)}
                      {e.motivo && <span className="text-muted-foreground"> · {e.motivo}</span>}
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {e.tipo === "fechado"
                        ? "Fechado o dia todo"
                        : `Aberto: ${e.horarios.join(" · ")}`}
                    </p>
                  </button>
                  <button
                    onClick={() => removerAjuste(iso)}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remover"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
