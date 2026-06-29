"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RotateCcw, ArrowRight } from "lucide-react";
import { useBooking, type ServicoSelecionado } from "@/lib/store/booking";
import { telefoneLembrado } from "@/lib/utils/telefone";

type UltimoCorte =
  | { encontrado: false }
  | { encontrado: true; servicos: ServicoSelecionado[] };

// Banner "Repetir Último Corte" — aparece só quando há histórico (telefone lembrado
// + último corte concluído). Pré-popula o booking e pula pro horário. Zero login.
export function RepetirUltimoCorte() {
  const preselecionar = useBooking((s) => s.preselecionar);
  const passo = useBooking((s) => s.passo);
  const temServicos = useBooking((s) => s.servicos.length > 0);
  const [dados, setDados] = useState<{ servicos: ServicoSelecionado[] } | null>(
    null
  );

  useEffect(() => {
    const tel = telefoneLembrado();
    if (!tel || tel.length < 10) return;
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch(`/api/clientes/${tel}/ultimo-corte`);
        if (!res.ok) return;
        const json: UltimoCorte = await res.json();
        if (!cancelado && json.encontrado) setDados({ servicos: json.servicos });
      } catch {
        /* sem histórico — não mostra nada */
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  // Só na entrada (passo horário, antes de escolher serviços)
  if (!dados || passo !== 0 || temServicos) return null;

  const nomes = dados.servicos.map((s) => s.nome).join(" + ");

  return (
    <AnimatePresence>
      <motion.button
        type="button"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        onClick={() => preselecionar(dados.servicos)}
        className="group mt-6 flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-left shadow-sm transition-[transform,border-color] hover:border-primary/40 active:scale-[0.99]"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
          <RotateCcw className="size-5" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Seu último corte
          </span>
          <span className="mt-0.5 block truncate text-sm font-medium text-foreground">
            {nomes}
          </span>
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold text-primary">
          Agendar de novo
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      </motion.button>
    </AnimatePresence>
  );
}
