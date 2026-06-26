"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { useBooking } from "@/lib/store/booking";
import {
  dataISOLocal,
  nomeMesAno,
  rotuloRelativo,
} from "@/lib/utils/format";
import { slotsQueryOptions, prefetchSlots } from "@/lib/queries/slots";
import { cn } from "@/lib/utils";
import { CalendarSheet } from "./CalendarSheet";

// Próximos N dias disponíveis (pula domingo=0 e segunda=1 — folga)
function proximosDias(qtd: number): Date[] {
  const dias: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (dias.length < qtd) {
    const diaSemana = cursor.getDay();
    if (diaSemana !== 0 && diaSemana !== 1) dias.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

// Agrupa horários por período do dia — dá estrutura à grade
function agruparPorPeriodo(slots: string[]) {
  const grupos: { rotulo: string; itens: string[] }[] = [
    { rotulo: "Manhã", itens: [] },
    { rotulo: "Tarde", itens: [] },
    { rotulo: "Noite", itens: [] },
  ];
  for (const s of slots) {
    const h = Number(s.split(":")[0]);
    if (h < 12) grupos[0].itens.push(s);
    else if (h < 18) grupos[1].itens.push(s);
    else grupos[2].itens.push(s);
  }
  return grupos.filter((g) => g.itens.length > 0);
}

export function StepHorario() {
  const { data, horario, setData, setHorario } = useBooking();
  const client = useQueryClient();
  const reduzir = useReducedMotion();
  const [qtdDias, setQtdDias] = useState(30);
  const dias = useMemo(() => proximosDias(qtdDias), [qtdDias]);
  const stripRef = useRef<HTMLDivElement>(null);
  const [agendaAberta, setAgendaAberta] = useState(false);

  // Auto-seleciona o primeiro dia e pré-carrega os próximos — slots aparecem na hora
  useEffect(() => {
    if (!data && dias[0]) setData(dataISOLocal(dias[0]));
    dias.slice(0, 5).forEach((d) => prefetchSlots(client, dataISOLocal(d)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll do mouse (wheel vertical) → rola a régua na horizontal no desktop
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const aoWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // já é horizontal
      if (el.scrollWidth <= el.clientWidth) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };
    el.addEventListener("wheel", aoWheel, { passive: false });
    return () => el.removeEventListener("wheel", aoWheel);
  }, []);

  // Régua infinita: ao chegar perto do fim, gera mais dias (sem limite de data)
  function aoRolar() {
    const el = stripRef.current;
    if (!el) return;
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 240) {
      setQtdDias((q) => q + 30);
    }
  }

  const { data: slots, isLoading } = useQuery(slotsQueryOptions(data));
  const grupos = useMemo(() => (slots ? agruparPorPeriodo(slots) : []), [slots]);

  // mês exibido = mês do dia selecionado (ou primeiro da régua)
  const mesRotulo = nomeMesAno(data ?? dataISOLocal(dias[0]));

  function rolar(dir: -1 | 1) {
    stripRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Escolha o dia e horário
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Atendemos de terça a sábado.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAgendaAberta(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-muted"
        >
          <CalendarRange className="size-3.5" aria-hidden="true" />
          Agenda completa
        </button>
      </div>

      {/* Caption do mês + setas (desktop) */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {mesRotulo}
        </p>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => rolar(-1)}
            aria-label="Dias anteriores"
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground/45 transition-colors hover:bg-muted hover:text-foreground active:scale-90"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => rolar(1)}
            aria-label="Próximos dias"
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground/45 transition-colors hover:bg-muted hover:text-foreground active:scale-90"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Régua de dias — scroll horizontal com fades nas bordas */}
      <div className="relative -mx-1">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-card to-transparent md:from-card" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-card to-transparent md:from-card" />
        <div
          ref={stripRef}
          onScroll={aoRolar}
          className="flex touch-pan-x gap-2.5 overflow-x-auto overscroll-x-contain px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {dias.map((d) => {
            const iso = dataISOLocal(d);
            const ativo = data === iso;
            const mesAbrev = d
              .toLocaleDateString("pt-BR", { month: "short" })
              .replace(".", "");
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setData(iso)}
                onMouseEnter={() => prefetchSlots(client, iso)}
                onFocus={() => prefetchSlots(client, iso)}
                aria-pressed={ativo}
                className={cn(
                  "flex min-w-[68px] shrink-0 flex-col items-center gap-1 rounded-xl border px-3 py-3 transition-[transform,border-color,background-color,box-shadow] active:scale-95",
                  ativo
                    ? "border-primary bg-primary text-primary-foreground shadow-md"
                    : "border-border bg-card text-foreground shadow-xs hover:border-primary/40 hover:shadow-sm"
                )}
              >
                <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">
                  {rotuloRelativo(d)}
                </span>
                <span className="font-mono text-lg font-semibold tabular-nums">
                  {String(d.getDate()).padStart(2, "0")}
                </span>
                <span className="text-[10px] uppercase tracking-wide opacity-70">
                  {mesAbrev}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Horários */}
      {!data ? null : isLoading ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : grupos.length > 0 ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={data}
            initial={reduzir ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduzir ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="space-y-5"
          >
            {grupos.map((g) => (
              <div key={g.rotulo} className="space-y-2.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {g.rotulo}
                </p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {g.itens.map((h) => {
                    const ativo = horario === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHorario(h)}
                        aria-pressed={ativo}
                        className={cn(
                          "flex h-11 items-center justify-center rounded-lg border font-mono text-sm font-medium tabular-nums transition-[transform,border-color,background-color,box-shadow] active:scale-95",
                          ativo
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-card text-foreground hover:border-primary/40"
                        )}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
          Nenhum horário disponível neste dia. Tente outro.
        </p>
      )}

      <CalendarSheet
        open={agendaAberta}
        onClose={() => setAgendaAberta(false)}
        selected={data}
        onSelect={(iso) => {
          setData(iso);
          prefetchSlots(client, iso);
        }}
      />
    </div>
  );
}
