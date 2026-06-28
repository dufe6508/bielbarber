"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Phone,
  Moon,
  Loader2,
} from "lucide-react";
import { Pill } from "@/components/admin/primitives";
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

function proxima(h: string) {
  return `${String(Number(h.split(":")[0]) + 1).padStart(2, "0")}:00`;
}

export function AgendaDia() {
  const [data, setData] = useState(() => dataISOLocal(new Date()));
  const [horarios, setHorarios] = useState<string[]>([]);
  const [ags, setAgs] = useState<Ag[]>([]);
  const [carregando, setCarregando] = useState(true);

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
                    <div className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {ag.cliente.nome}
                          </p>
                          <Pill tom={STATUS_TOM[ag.status] ?? "neutro"}>
                            {ag.status === "agendado"
                              ? "agendado"
                              : ag.status === "concluido"
                              ? "concluído"
                              : "faltou"}
                          </Pill>
                          {ag.slots >= 2 && <Pill tom="neutro">2h</Pill>}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {ag.servicos.join(", ")}
                        </p>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Phone className="size-3" />
                          {formatarTelefone(ag.cliente.telefone)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                          {formatarPreco(ag.valorTotal)}
                        </span>
                        <Pill tom={ag.statusPagamento === "pago" ? "verde" : "neutro"}>
                          {ag.statusPagamento === "pago" ? "pago" : "pendente"}
                        </Pill>
                      </div>
                    </div>
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
    </div>
  );
}
