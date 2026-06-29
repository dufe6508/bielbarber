"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

type Props = {
  selected: string | null;
  onSelect: (iso: string) => void;
  min?: string;
  max?: string;
  disabled?: (iso: string) => boolean;
  /** dias que recebem um ponto indicador (ex.: já têm ajuste) */
  marcados?: (iso: string) => boolean;
  /** quando definido, pinta o intervalo [rangeStart, selected] com preenchimento progressivo */
  rangeStart?: string;
  className?: string;
};

function isoParaData(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
}

function dataParaISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function diffDias(isoA: string, isoB: string) {
  return Math.round(
    (isoParaData(isoB).getTime() - isoParaData(isoA).getTime()) / 86_400_000
  );
}

export function MiniCalendar({
  selected,
  onSelect,
  min,
  max,
  disabled,
  marcados,
  rangeStart,
  className,
}: Props) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeISO = dataParaISO(hoje);

  const base = selected ? isoParaData(selected) : hoje;
  const [mesAtivo, setMesAtivo] = useState(
    () => new Date(base.getFullYear(), base.getMonth(), 1)
  );

  const ano = mesAtivo.getFullYear();
  const mes = mesAtivo.getMonth();

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();

  const celulas: (Date | null)[] = [
    ...Array(primeiroDia).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => new Date(ano, mes, i + 1)),
  ];

  const mesAnteriorBloq =
    min != null
      ? new Date(ano, mes, 1) <= isoParaData(min.slice(0, 7) + "-01")
      : false;

  const [dir, setDir] = useState(0); // direção da troca de mês (anima slide)
  function mover(delta: number) {
    setDir(delta);
    setMesAtivo((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  // Limites do range normalizados (start pode ser depois do selected)
  const rangeAtivo = !!rangeStart && !!selected;
  const rIni = rangeAtivo
    ? diffDias(rangeStart!, selected!) >= 0
      ? rangeStart!
      : selected!
    : null;
  const rFim = rangeAtivo
    ? diffDias(rangeStart!, selected!) >= 0
      ? selected!
      : rangeStart!
    : null;

  function noRange(iso: string) {
    if (!rIni || !rFim) return false;
    return iso >= rIni && iso <= rFim;
  }

  return (
    <div className={cn("w-full select-none", className)}>
      {/* Navegação de mês */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => mover(-1)}
          disabled={mesAnteriorBloq}
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold capitalize text-foreground">
          {MESES[mes]} de {ano}
        </span>
        <button
          type="button"
          onClick={() => mover(1)}
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Cabeçalho dias da semana */}
      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {DIAS_SEMANA.map((d, i) => (
          <div
            key={i}
            className="text-center font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grade — colunas coladas (gap-x-0) p/ a "minhoca" do range conectar;
          gap-y entre as semanas mantém cada faixa separada por linha. */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={`${ano}-${mes}`}
            custom={dir}
            initial={{ opacity: 0, x: dir === 0 ? 0 : dir > 0 ? 16 : -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir > 0 ? -16 : 16 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="grid grid-cols-7 gap-x-0 gap-y-1"
          >
            {celulas.map((d, i) => {
              if (!d) return <div key={`v-${i}`} className="aspect-square" />;
              const iso = dataParaISO(d);
              const col = i % 7;
              const antesMin = min ? iso < min : false;
              const depoisMax = max ? iso > max : false;
              const desab = antesMin || depoisMax || disabled?.(iso) || false;
              const ativo = selected === iso;
              const ehInicioRange = rIni === iso;
              const dentroRange = noRange(iso);
              const endpoint = ativo || ehInicioRange;
              const meioRange = dentroRange && !endpoint;
              const ehHoje = iso === hojeISO;
              const temMarca = marcados?.(iso) && !ativo;

              // Vizinhos no range (corta nas bordas da semana → faixa por linha)
              const prevD = i > 0 ? celulas[i - 1] : null;
              const nextD = celulas[i + 1] ?? null;
              const prevInRange =
                col !== 0 && prevD instanceof Date && noRange(dataParaISO(prevD));
              const nextInRange =
                col !== 6 && nextD instanceof Date && noRange(dataParaISO(nextD));
              const capL = !prevInRange; // ponta arredondada à esquerda
              const capR = !nextInRange; // ponta arredondada à direita

              // cascata do preenchimento a partir do início do range
              const delay = rIni ? Math.max(0, diffDias(rIni, iso)) * 0.02 : 0;

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={desab}
                  onClick={() => onSelect(iso)}
                  aria-pressed={ativo}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-full font-mono text-[12px] tabular-nums transition-[transform,color] duration-150 active:scale-90",
                    endpoint
                      ? "z-10 font-semibold text-background"
                      : meioRange
                      ? "font-medium text-foreground"
                      : desab
                      ? "pointer-events-none text-muted-foreground/25"
                      : "text-foreground/90 hover:bg-accent",
                    ehHoje && !endpoint && !meioRange && "ring-1 ring-inset ring-foreground/25"
                  )}
                >
                  {/* Faixa do range (a "minhoca"): toca os vizinhos, arredonda nas pontas */}
                  {dentroRange && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay, duration: 0.16, ease: "easeOut" }}
                      className={cn(
                        "absolute inset-y-1 left-0 right-0 bg-foreground/12",
                        capL && "left-1 rounded-l-full",
                        capR && "right-1 rounded-r-full"
                      )}
                    />
                  )}
                  {/* Pontas sólidas (branco) com glow suave */}
                  {endpoint && (
                    <motion.span
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 440, damping: 26 }}
                      className="absolute inset-1 rounded-full bg-foreground shadow-[0_2px_10px_-2px_color-mix(in_oklch,var(--foreground)_45%,transparent)]"
                    />
                  )}
                  <span className="relative">{d.getDate()}</span>
                  {temMarca && (
                    <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-foreground ring-2 ring-background" />
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
