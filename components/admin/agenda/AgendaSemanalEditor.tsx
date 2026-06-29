"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, Moon, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const GRADE = Array.from({ length: 15 }, (_, i) => `${String(8 + i).padStart(2, "0")}:00`);

const DIAS: { dow: number; nome: string; folga?: boolean }[] = [
  { dow: 2, nome: "Terça-feira" },
  { dow: 3, nome: "Quarta-feira" },
  { dow: 4, nome: "Quinta-feira" },
  { dow: 5, nome: "Sexta-feira" },
  { dow: 6, nome: "Sábado" },
  { dow: 0, nome: "Domingo", folga: true },
  { dow: 1, nome: "Segunda-feira", folga: true },
];

type DiaAgenda = { diaSemana: number; horarios: string[]; padrao: boolean };

function periodoDe(h: string): "Manhã" | "Tarde" | "Noite" {
  const n = Number(h.split(":")[0]);
  if (n < 12) return "Manhã";
  if (n < 18) return "Tarde";
  return "Noite";
}

export function AgendaSemanalEditor() {
  const [agenda, setAgenda] = useState<Record<number, string[]>>({});
  const [base, setBase] = useState<Record<number, string[]>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch("/api/admin/agenda-semanal")
      .then((r) => r.json())
      .then((dados: DiaAgenda[]) => {
        const mapa: Record<number, string[]> = {};
        for (const d of dados) mapa[d.diaSemana] = d.horarios;
        setAgenda(mapa);
        setBase(structuredClone(mapa));
      })
      .catch(() => toast.error("Não foi possível carregar a agenda."))
      .finally(() => setCarregando(false));
  }, []);

  const diasAlterados = useMemo(() => {
    const set = new Set<number>();
    for (const dow of Object.keys(agenda).map(Number)) {
      const a = [...(agenda[dow] ?? [])].sort().join(",");
      const b = [...(base[dow] ?? [])].sort().join(",");
      if (a !== b) set.add(dow);
    }
    return set;
  }, [agenda, base]);

  function alternar(dow: number, hora: string) {
    setAgenda((prev) => {
      const atuais = new Set(prev[dow] ?? []);
      if (atuais.has(hora)) atuais.delete(hora);
      else atuais.add(hora);
      return { ...prev, [dow]: [...atuais].sort() };
    });
  }

  function limpar(dow: number) {
    setAgenda((prev) => ({ ...prev, [dow]: [] }));
  }

  async function salvar() {
    setSalvando(true);
    try {
      for (const dow of diasAlterados) {
        const res = await fetch("/api/admin/agenda-semanal", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diaSemana: dow, horarios: agenda[dow] ?? [] }),
        });
        if (!res.ok) throw new Error();
      }
      setBase(structuredClone(agenda));
      toast.success("Agenda atualizada.");
    } catch {
      toast.error("Erro ao salvar. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  const totalAlterados = diasAlterados.size;

  if (carregando) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <>
      <p className="mb-5 text-sm text-muted-foreground">
        Seus horários fixos de cada dia. Toque para abrir ou fechar.
      </p>
      <div className="space-y-4 pb-24 md:pb-4">
        {DIAS.map(({ dow, nome, folga }) => {
          const horarios = agenda[dow] ?? [];
          const fechado = horarios.length === 0;
          const alterado = diasAlterados.has(dow);
          return (
            <section
              key={dow}
              className={cn(
                "rounded-2xl border bg-card p-5 shadow-xs transition-colors",
                alterado ? "border-primary/40" : "border-border"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                    {nome}
                  </h3>
                  {folga && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      <Moon className="size-2.5" aria-hidden="true" />
                      folga
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "font-mono text-xs tabular-nums",
                      fechado ? "text-muted-foreground/60" : "text-foreground"
                    )}
                  >
                    {fechado ? "Fechado" : `${horarios.length} ${horarios.length === 1 ? "horário" : "horários"}`}
                  </span>
                  {!fechado && (
                    <button
                      type="button"
                      onClick={() => limpar(dow)}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <RotateCcw className="size-3" aria-hidden="true" />
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {GRADE.map((hora) => {
                  const aberto = horarios.includes(hora);
                  return (
                    <motion.button
                      key={hora}
                      type="button"
                      onClick={() => alternar(dow, hora)}
                      whileTap={{ scale: 0.88 }}
                      transition={{ type: "spring", stiffness: 500, damping: 28 }}
                      aria-pressed={aberto}
                      title={periodoDe(hora)}
                      className={cn(
                        "relative flex h-9 w-[58px] items-center justify-center rounded-lg border font-mono text-[13px] font-medium tabular-nums transition-colors",
                        aberto
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-dashed border-border bg-card text-muted-foreground/60 hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      {hora}
                    </motion.button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <AnimatePresence>
        {totalAlterados > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-y border-border bg-card/90 backdrop-blur-md md:bottom-0 md:border-b-0"
          >
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3.5">
              <p className="text-sm text-muted-foreground">
                <strong className="font-semibold text-foreground">{totalAlterados}</strong>{" "}
                {totalAlterados === 1 ? "dia alterado" : "dias alterados"}
              </p>
              <button
                type="button"
                onClick={salvar}
                disabled={salvando}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
              >
                {salvando ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="size-4" aria-hidden="true" />
                )}
                {salvando ? "Salvando…" : "Salvar alterações"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
