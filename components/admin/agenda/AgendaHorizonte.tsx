"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, Check, Loader2, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MiniCalendar } from "@/components/admin/MiniCalendar";
import { CollapsibleCard } from "@/components/admin/CollapsibleCard";

const ATALHOS = [
  { dias: 15, rotulo: "2 semanas" },
  { dias: 30, rotulo: "1 mês" },
  { dias: 60, rotulo: "2 meses" },
  { dias: 90, rotulo: "3 meses" },
];

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDias(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function diffDias(isoA: string, isoB: string) {
  const a = new Date(isoA + "T00:00:00");
  const b = new Date(isoB + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
function dataLonga(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function AgendaHorizonte() {
  const [dias, setDias] = useState(60);
  const [base, setBase] = useState(60);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const hoje = hojeISO();
  const dataCorte = addDias(hoje, dias);
  const maxData = addDias(hoje, 365);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((d) => {
        setDias(d.horizonteDias);
        setBase(d.horizonteDias);
      })
      .catch(() => toast.error("Erro ao carregar."))
      .finally(() => setCarregando(false));
  }, []);

  function setViaData(iso: string) {
    const d = diffDias(hoje, iso);
    if (d >= 1 && d <= 365) setDias(d);
  }

  async function salvar() {
    setSalvando(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horizonteDias: dias }),
      });
      if (!res.ok) throw new Error();
      setBase(dias);
      toast.success("Pronto. É até essa data.");
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <div className="h-72 animate-pulse rounded-2xl bg-muted" />;
  }

  const alterado = dias !== base;
  const semanas = Math.round(dias / 7);

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Até onde a agenda fica aberta para o cliente marcar. Selecione a data final
        e a janela se ajusta sozinha.
      </p>

      {/* Resumo grande */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarClock className="size-4" />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
            Janela de agendamento
          </span>
        </div>
        <p className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground">
          Próximos {dias} dias
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          De hoje até <span className="font-medium text-foreground">{dataLonga(dataCorte)}</span>
          {" · "}{semanas} {semanas === 1 ? "semana" : "semanas"}
        </p>
      </div>

      {/* Atalhos */}
      <div className="flex flex-wrap gap-2">
        {ATALHOS.map((a) => (
          <button
            key={a.dias}
            onClick={() => setDias(a.dias)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95",
              dias === a.dias
                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {/* Calendário com range (retrátil) */}
      <CollapsibleCard
        titulo="Ajuste no calendário"
        subtitulo="Toque na data final exata"
        icone={<CalendarRange className="size-4" />}
        resumo={dataLonga(dataCorte)}
        defaultOpen
      >
        <div className="mx-auto max-w-[336px] rounded-2xl border border-border bg-background p-3 sm:p-4">
          <MiniCalendar
            selected={dataCorte}
            onSelect={setViaData}
            rangeStart={hoje}
            min={addDias(hoje, 1)}
            max={maxData}
          />
        </div>
      </CollapsibleCard>

      {/* Salvar */}
      <AnimatePresence>
        {alterado && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
          >
            <button
              onClick={salvar}
              disabled={salvando}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 sm:w-auto"
            >
              {salvando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Salvar janela
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
