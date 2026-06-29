"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  titulo: string;
  subtitulo?: string;
  icone?: ReactNode;
  resumo?: ReactNode; // mostrado à direita quando fechado (ex.: valor atual)
  defaultOpen?: boolean;
  open?: boolean; // controlado: quando passado, o pai manda no estado
  onOpenChange?: (aberto: boolean) => void;
  children: ReactNode;
  className?: string;
};

// Card retrátil premium: header sempre visível, conteúdo expande com height auto.
export function CollapsibleCard({
  titulo,
  subtitulo,
  icone,
  resumo,
  defaultOpen = false,
  open,
  onOpenChange,
  children,
  className,
}: Props) {
  const [interno, setInterno] = useState(defaultOpen);
  const aberto = open ?? interno;
  const setAberto = (v: boolean) => {
    if (open === undefined) setInterno(v);
    onOpenChange?.(v);
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-xs transition-colors",
        aberto ? "border-primary/30" : "border-border",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        className="group flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40"
      >
        {icone && (
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icone}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-base font-semibold tracking-tight text-foreground">
            {titulo}
          </h3>
          {subtitulo && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitulo}</p>
          )}
        </div>
        {resumo && !aberto && (
          <span className="shrink-0 text-sm font-medium text-muted-foreground">{resumo}</span>
        )}
        <motion.span
          animate={{ rotate: aberto ? 180 : 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground group-hover:text-foreground"
        >
          <ChevronDown className="size-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-5 py-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
