"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { dataISOLocal, formatarData, nomeMesAno } from "@/lib/utils/format";
import { prefetchSlots } from "@/lib/queries/slots";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
// Folga: domingo (0) e segunda (1)
const FOLGA = new Set([0, 1]);

function inicioDoDia(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

type Props = {
  open: boolean;
  onClose: () => void;
  selected: string | null;
  limite: string; // última data aberta pelo barbeiro (YYYY-MM-DD)
  onSelect: (iso: string) => void;
};

export function CalendarSheet({ open, onClose, selected, limite, onSelect }: Props) {
  const client = useQueryClient();
  const hoje = inicioDoDia(new Date());
  const limiteDia = (() => {
    const [a, m, d] = limite.split("-").map(Number);
    return inicioDoDia(new Date(a, m - 1, d));
  })();
  const [mesAtivo, setMesAtivo] = useState(() => {
    const base = selected ? new Date(selected + "T00:00:00") : hoje;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  // índice ano*12+mês — pra comparar meses sem confusão de fuso
  const idxMes = (d: Date) => d.getFullYear() * 12 + d.getMonth();

  // Não deixa navegar para meses já passados
  const mesAnteriorBloqueado =
    mesAtivo.getFullYear() === hoje.getFullYear() &&
    mesAtivo.getMonth() === hoje.getMonth();
  // Nem além do mês do horizonte aberto
  const proximoMesBloqueado = idxMes(mesAtivo) >= idxMes(limiteDia);
  // Este mês tem algum dia ainda não liberado (mostra o aviso)
  const mesTemDiaFechado = idxMes(mesAtivo) >= idxMes(limiteDia);

  const primeiroDiaSemana = mesAtivo.getDay();
  const diasNoMes = new Date(
    mesAtivo.getFullYear(),
    mesAtivo.getMonth() + 1,
    0
  ).getDate();

  // Células: offset vazio + dias do mês
  const celulas: (Date | null)[] = [
    ...Array(primeiroDiaSemana).fill(null),
    ...Array.from(
      { length: diasNoMes },
      (_, i) => new Date(mesAtivo.getFullYear(), mesAtivo.getMonth(), i + 1)
    ),
  ];

  function mudarMes(delta: number) {
    setMesAtivo(
      (m) => new Date(m.getFullYear(), m.getMonth() + delta, 1)
    );
  }

  function escolher(d: Date) {
    onSelect(dataISOLocal(d));
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Fechar calendário"
            onClick={onClose}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1 },
            }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
          />

          {/* Painel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Agenda completa"
            variants={{
              hidden: { opacity: 0, y: 24, scale: 0.98 },
              visible: { opacity: 1, y: 0, scale: 1 },
            }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative w-full max-w-md rounded-t-3xl border border-border bg-card p-5 shadow-2xl sm:rounded-3xl sm:p-6"
          >
            {/* alça mobile */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Agenda completa
                </p>
                <h3 className="mt-0.5 font-heading text-xl font-semibold tracking-tight text-foreground">
                  {nomeMesAno(mesAtivo)}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => mudarMes(-1)}
                  disabled={mesAnteriorBloqueado}
                  aria-label="Mês anterior"
                  className="flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => mudarMes(1)}
                  disabled={proximoMesBloqueado}
                  aria-label="Próximo mês"
                  className="flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar"
                  className="ml-1 flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Cabeçalho de semana */}
            <div className="mt-5 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  {w}
                </div>
              ))}
            </div>

            {/* Grade do mês */}
            <div className="mt-1.5 grid grid-cols-7 gap-1">
              {celulas.map((d, i) => {
                if (!d) return <div key={`v-${i}`} />;
                const iso = dataISOLocal(d);
                const passado = inicioDoDia(d) < hoje;
                const aposLimite = inicioDoDia(d) > limiteDia;
                const folga = FOLGA.has(d.getDay());
                const indisponivel = passado || folga || aposLimite;
                const ativo = selected === iso;
                const ehHoje = inicioDoDia(d).getTime() === hoje.getTime();
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={indisponivel}
                    onClick={() => escolher(d)}
                    onMouseEnter={() => prefetchSlots(client, iso)}
                    onFocus={() => prefetchSlots(client, iso)}
                    aria-pressed={ativo}
                    className={cn(
                      "relative flex aspect-square items-center justify-center rounded-xl font-mono text-sm tabular-nums transition-[transform,background-color,color] active:scale-90",
                      ativo
                        ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                        : indisponivel
                        ? "text-muted-foreground/35"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    {d.getDate()}
                    {ehHoje && !ativo && (
                      <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              {mesTemDiaFechado
                ? `Agenda aberta até ${formatarData(limite)}. Os demais dias ainda não foram liberados.`
                : "Atendemos de terça a sábado."}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
