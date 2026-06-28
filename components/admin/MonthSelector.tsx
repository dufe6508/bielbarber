"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Calendar, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Dropdown discreto de mês. Lista os últimos 12 meses; navega para ?mes=YYYY-MM.
function meses(qtd: number): { valor: string; rotulo: string }[] {
  const out: { valor: string; rotulo: string }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < qtd; i++) {
    const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const rotulo = d
      .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      .replace(/^\w/, (c) => c.toUpperCase());
    out.push({ valor, rotulo });
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

export function MonthSelector({ atual }: { atual: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const opcoes = meses(12);
  const selecionado = opcoes.find((m) => m.valor === atual) ?? opcoes[0];

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    window.addEventListener("mousedown", fora);
    return () => window.removeEventListener("mousedown", fora);
  }, [aberto]);

  function escolher(valor: string) {
    setAberto(false);
    router.push(`?mes=${valor}`);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAberto((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-muted"
      >
        <Calendar className="size-3.5 text-muted-foreground" />
        {selecionado.rotulo}
        <ChevronDown
          className={cn("size-3.5 text-muted-foreground transition-transform", aberto && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 max-h-72 w-52 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-xl"
          >
            {opcoes.map((m) => {
              const on = m.valor === selecionado.valor;
              return (
                <button
                  key={m.valor}
                  onClick={() => escolher(m.valor)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    on
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  {m.rotulo}
                  {on && <Check className="size-3.5" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
