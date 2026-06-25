"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { Check } from "lucide-react";
import { useBooking } from "@/lib/store/booking";
import { formatarPreco } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Servico = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: string;
};

const SPRING = { type: "spring", stiffness: 360, damping: 26 } as const;

export function StepServicos() {
  const { servicos, toggleServico } = useBooking();
  const reduzir = useReducedMotion();

  const { data, isLoading, isError } = useQuery<Servico[]>({
    queryKey: ["servicos"],
    queryFn: async () => {
      const res = await fetch("/api/servicos");
      if (!res.ok) throw new Error("Erro ao carregar serviços");
      return res.json();
    },
  });

  const containerVariants: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduzir ? 0 : 0.04 },
    },
  };

  const itemVariants: Variants = reduzir
    ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 12 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.32, ease: [0.23, 1, 0.32, 1] },
        },
      };

  const totalSelecionado = servicos.length;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Escolha os serviços
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione um ou mais.
          </p>
        </div>

        {/* Contador animado de selecionados */}
        <AnimatePresence>
          {totalSelecionado > 0 && (
            <motion.span
              key="contador"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={SPRING}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
            >
              <motion.span
                key={totalSelecionado}
                initial={{ scale: reduzir ? 1 : 0.4 }}
                animate={{ scale: 1 }}
                transition={SPRING}
                className="tabular-nums"
              >
                {totalSelecionado}
              </motion.span>
              {totalSelecionado === 1 ? "selecionado" : "selecionados"}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {isError && (
        <p className="rounded-xl bg-destructive/10 p-4 text-center text-sm text-destructive">
          Não foi possível carregar os serviços. Recarregue a página.
        </p>
      )}

      {data && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-3 sm:grid-cols-2"
        >
          {data.map((s) => {
            const selecionado = servicos.some((x) => x.id === s.id);
            return (
              <motion.button
                key={s.id}
                type="button"
                variants={itemVariants}
                whileTap={reduzir ? undefined : { scale: 0.985 }}
                onClick={() =>
                  toggleServico({
                    id: s.id,
                    nome: s.nome,
                    preco: Number(s.preco),
                  })
                }
                aria-pressed={selecionado}
                className={cn(
                  "group relative flex items-start gap-3.5 rounded-xl border p-4 text-left transition-colors duration-200",
                  selecionado
                    ? "border-primary bg-accent/50"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                )}
              >
                {/* Indicador de seleção (radio → check) */}
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200",
                    selecionado
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/35 bg-transparent group-hover:border-primary/50"
                  )}
                >
                  <AnimatePresence>
                    {selecionado && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={SPRING}
                      >
                        <Check
                          className="size-3 text-primary-foreground"
                          strokeWidth={3.5}
                        />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>

                {/* Conteúdo */}
                <span className="min-w-0 flex-1">
                  <span className="block font-medium leading-snug text-foreground">
                    {s.nome}
                  </span>
                  {s.descricao && (
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {s.descricao}
                    </span>
                  )}
                </span>

                {/* Preço */}
                <span className="shrink-0 font-mono text-base font-semibold tabular-nums text-foreground">
                  {formatarPreco(s.preco)}
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
