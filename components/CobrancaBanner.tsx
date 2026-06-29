"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wallet, AlertTriangle, X } from "lucide-react";
import { PagamentoDrawer } from "@/components/PagamentoDrawer";
import { telefoneLembrado } from "@/lib/utils/telefone";
import { formatarPreco, formatarData } from "@/lib/utils/format";

type Aberta = {
  id: string;
  valor: string;
  status: "pendente" | "vencido";
  vencimento: string | null;
  descricao: string | null;
};

// Banner de mensalidade pendente na Home. Aparece só quando há cobrança em aberto
// para o telefone lembrado do cliente. Botão "Pagar agora" abre o checkout.
export function CobrancaBanner() {
  const [aberta, setAberta] = useState<Aberta | null>(null);
  const [pagar, setPagar] = useState(false);
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    const tel = telefoneLembrado();
    if (!tel) return;
    let vivo = true;
    (async () => {
      try {
        const res = await fetch(`/api/cobrancas/${tel}`);
        if (!res.ok) return;
        const dados = await res.json();
        if (vivo && dados?.aberta) setAberta(dados.aberta);
      } catch {
        /* silencioso */
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  if (!aberta || oculto) return null;

  const vencido = aberta.status === "vencido";

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mt-4"
        >
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-4 shadow-sm dark:border-amber-400/25 dark:bg-amber-400/[0.08]">
            <button
              onClick={() => setOculto(true)}
              aria-label="Dispensar"
              className="absolute right-2.5 top-2.5 inline-flex size-7 items-center justify-center rounded-lg text-amber-700/60 transition-colors hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-300/60 dark:hover:text-amber-300"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                {vencido ? (
                  <AlertTriangle className="size-5" />
                ) : (
                  <Wallet className="size-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-sm font-semibold text-foreground">
                  {vencido ? "Mensalidade vencida" : "Mensalidade pendente"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {aberta.descricao ? `${aberta.descricao} · ` : ""}
                  <span className="font-mono font-semibold tabular-nums text-foreground">
                    {formatarPreco(aberta.valor)}
                  </span>
                  {aberta.vencimento && (
                    <> · vence {formatarData(aberta.vencimento)}</>
                  )}
                </p>
                <button
                  onClick={() => setPagar(true)}
                  className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97]"
                >
                  <Wallet className="size-4" />
                  Pagar agora
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <PagamentoDrawer
        open={pagar}
        onOpenChange={setPagar}
        total={Number(aberta.valor)}
        chargeId={aberta.id}
        vencimento={aberta.vencimento}
        descricao={aberta.descricao}
        onPago={() => setOculto(true)}
      />
    </>
  );
}
