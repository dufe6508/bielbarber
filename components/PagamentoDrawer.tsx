"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Drawer } from "vaul";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Loader2, CalendarClock, Clock3, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { formatarPreco, formatarData } from "@/lib/utils/format";
import type { ResultadoPagamento } from "@/components/MpPaymentBrick";

// O Brick depende de `window` — carrega só no cliente.
const MpPaymentBrick = dynamic(
  () => import("@/components/MpPaymentBrick").then((m) => m.MpPaymentBrick),
  { ssr: false }
);

type Etapa = "form" | "pix" | "sucesso" | "pendente";
type Pix = { qrCode: string; qrCodeBase64: string; ticketUrl: string | null };

export function PagamentoDrawer({
  open,
  onOpenChange,
  total,
  onPago,
  chargeId,
  vencimento,
  descricao,
  barbearia = "Biel Barber",
  legenda,
  textoPixRodape = "Assim que o pagamento cair, a mensalidade é baixada automaticamente.",
  tituloSucesso = "Pagamento confirmado",
  textoSucesso = "Mensalidade quitada. Até o próximo corte!",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  total: number;
  onPago?: () => void;
  chargeId?: string;
  vencimento?: string | null;
  descricao?: string | null;
  barbearia?: string;
  legenda?: string;
  textoPixRodape?: string;
  tituloSucesso?: string;
  textoSucesso?: string;
}) {
  const [etapa, setEtapa] = useState<Etapa>("form");
  const [pix, setPix] = useState<Pix | null>(null);

  function handleOpenChange(v: boolean) {
    onOpenChange(v);
    if (!v) {
      setEtapa("form");
      setPix(null);
    }
  }

  function handleResult(r: ResultadoPagamento) {
    if (r.tipo === "pix") {
      setPix({ qrCode: r.qrCode, qrCodeBase64: r.qrCodeBase64, ticketUrl: r.ticketUrl });
      setEtapa("pix");
      return;
    }
    if (r.tipo === "aprovado") {
      setEtapa("sucesso");
      onPago?.();
      setTimeout(() => handleOpenChange(false), 2600);
      return;
    }
    // pendente (em análise)
    setEtapa("pendente");
    onPago?.();
  }

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-foreground/50 backdrop-blur-[2px]" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92vh] max-w-md flex-col rounded-t-3xl border border-border bg-background outline-none">
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-border" />

          <div className="overflow-y-auto px-6 pb-8 pt-4">
            <Drawer.Title className="sr-only">Pagamento</Drawer.Title>

            <AnimatePresence mode="wait">
              {etapa === "form" && (
                <Passo key="form">
                  <CabecalhoValor
                    total={total}
                    legenda={legenda ?? (chargeId ? `Mensalidade · ${barbearia}` : "Total a pagar")}
                  />
                  {(vencimento || descricao) && (
                    <div className="mt-4 space-y-1.5 rounded-xl border border-border bg-card p-3.5 text-sm">
                      {descricao && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Referente a</span>
                          <span className="font-medium text-foreground">{descricao}</span>
                        </div>
                      )}
                      {vencimento && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <CalendarClock className="size-3.5" /> Vencimento
                          </span>
                          <span className="font-mono tabular-nums text-foreground">
                            {formatarData(vencimento)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-6">
                    {chargeId ? (
                      <MpPaymentBrick
                        amount={total}
                        chargeId={chargeId}
                        onResult={handleResult}
                        onErro={(msg) => msg && toast.error(msg)}
                      />
                    ) : (
                      <p className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
                        Cobrança não encontrada.
                      </p>
                    )}
                  </div>
                </Passo>
              )}

              {etapa === "pix" && pix && (
                <Passo key="pix">
                  <CabecalhoValor total={total} legenda="Pague via Pix" />
                  <div className="mt-6 flex flex-col items-center">
                    {pix.qrCodeBase64 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`data:image/png;base64,${pix.qrCodeBase64}`}
                        alt="QR Code Pix"
                        className="size-52 rounded-2xl border border-border bg-white p-2"
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(pix.qrCode);
                        toast.success("Código Pix copiado");
                      }}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
                    >
                      <Copy className="size-4" />
                      Copiar código Pix
                    </button>
                    {pix.ticketUrl && (
                      <a
                        href={pix.ticketUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:underline"
                      >
                        Abrir no app do banco <ExternalLink className="size-3" />
                      </a>
                    )}
                    <p className="mt-4 text-center text-xs text-muted-foreground">
                      {textoPixRodape}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenChange(false)}
                    className="mt-7 h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
                  >
                    Já paguei
                  </button>
                </Passo>
              )}

              {etapa === "pendente" && (
                <Passo key="pendente">
                  <div className="flex flex-col items-center gap-4 py-14 text-center">
                    <span className="flex size-16 items-center justify-center rounded-full bg-amber-500/12 text-amber-600 dark:text-amber-400">
                      <Clock3 className="size-8" />
                    </span>
                    <div>
                      <p className="font-heading text-xl font-semibold tracking-tight text-foreground">
                        Pagamento em análise
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Você será avisado assim que for confirmado.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenChange(false)}
                      className="mt-2 h-11 rounded-xl border border-border bg-card px-6 text-sm font-medium text-foreground"
                    >
                      Fechar
                    </button>
                  </div>
                </Passo>
              )}

              {etapa === "sucesso" && (
                <Passo key="sucesso">
                  <div className="flex flex-col items-center gap-4 py-14 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 16 }}
                      className="flex size-20 items-center justify-center rounded-full bg-primary/10"
                    >
                      <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-8" strokeWidth={3} />
                      </div>
                    </motion.div>
                    <div>
                      <p className="font-heading text-xl font-semibold tracking-tight text-foreground">
                        {tituloSucesso}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {textoSucesso}
                      </p>
                    </div>
                  </div>
                </Passo>
              )}
            </AnimatePresence>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function Passo({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -14 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}

function CabecalhoValor({ total, legenda }: { total: number; legenda: string }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {legenda}
      </p>
      <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-foreground">
        {formatarPreco(total)}
      </p>
    </div>
  );
}
