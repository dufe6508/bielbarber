"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  Copy,
  Loader2,
  CalendarClock,
  Clock3,
  ExternalLink,
  X,
  ShieldCheck,
  QrCode,
  CreditCard,
} from "lucide-react";
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
  const [brickPronto, setBrickPronto] = useState(false);
  // Mostra o fallback (Checkout Pro) se o Brick não carregar — comum quando
  // sdk.mercadopago.com está bloqueado (adblock/extensão/rede).
  const [mostrarFallback, setMostrarFallback] = useState(false);
  const [redirecionando, setRedirecionando] = useState(false);

  // Se o Brick não ficar pronto em 5s, oferece o checkout externo.
  useEffect(() => {
    if (!open || etapa !== "form" || brickPronto) return;
    const t = setTimeout(() => setMostrarFallback(true), 5000);
    return () => clearTimeout(t);
  }, [open, etapa, brickPronto]);

  function fechar() {
    onOpenChange(false);
    setEtapa("form");
    setPix(null);
    setBrickPronto(false);
    setMostrarFallback(false);
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
      setTimeout(fechar, 2600);
      return;
    }
    setEtapa("pendente");
    onPago?.();
  }

  // Fallback: abre o Checkout Pro hospedado no Mercado Pago (não usa o SDK JS).
  async function abrirCheckoutExterno() {
    if (!chargeId) return;
    setRedirecionando(true);
    try {
      const res = await fetch("/api/pagamentos/mercadopago/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chargeId }),
      });
      const d = await res.json().catch(() => null);
      if (d?.initPoint) {
        window.location.href = d.initPoint;
        return;
      }
      toast.error("Pagamento online indisponível agora. Fale com a barbearia.");
    } catch {
      toast.error("Falha ao abrir o pagamento. Tente de novo.");
    } finally {
      setRedirecionando(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex flex-col bg-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Topo */}
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Pagamento seguro · {barbearia}
              </span>
            </div>
            <button
              onClick={fechar}
              aria-label="Fechar"
              className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </header>

          <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-5 py-6">
            <AnimatePresence mode="wait">
              {etapa === "form" && (
                <Passo key="form">
                  <ValorGrande
                    total={total}
                    legenda={legenda ?? (chargeId ? `Pagamento · ${barbearia}` : "Total a pagar")}
                  />

                  {(vencimento || descricao) && (
                    <div className="mt-5 space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
                      {descricao && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Referente a</span>
                          <span className="text-right font-medium text-foreground">{descricao}</span>
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

                  {/* Métodos aceitos */}
                  <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <QrCode className="size-4" /> Pix
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CreditCard className="size-4" /> Cartão
                    </span>
                  </div>

                  <div className="mt-4">
                    {chargeId ? (
                      <MpPaymentBrick
                        amount={total}
                        chargeId={chargeId}
                        onReadyChange={setBrickPronto}
                        onResult={handleResult}
                        onErro={(msg) => {
                          if (msg) toast.error(msg);
                          setMostrarFallback(true);
                        }}
                      />
                    ) : (
                      <p className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
                        Cobrança não encontrada.
                      </p>
                    )}
                  </div>

                  {/* Fallback: Checkout Pro hospedado (quando o SDK não carrega) */}
                  {mostrarFallback && chargeId && (
                    <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">
                        Formulário demorando ou bloqueado? Pague na página segura do
                        Mercado Pago.
                      </p>
                      <button
                        type="button"
                        onClick={abrirCheckoutExterno}
                        disabled={redirecionando}
                        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
                      >
                        {redirecionando ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <>
                            Pagar no Mercado Pago <ExternalLink className="size-4" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </Passo>
              )}

              {etapa === "pix" && pix && (
                <Passo key="pix">
                  <ValorGrande total={total} legenda="Pague via Pix" />
                  <div className="mt-6 flex flex-col items-center">
                    {pix.qrCodeBase64 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`data:image/png;base64,${pix.qrCodeBase64}`}
                        alt="QR Code Pix"
                        className="size-60 rounded-2xl border border-border bg-white p-2"
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(pix.qrCode);
                        toast.success("Código Pix copiado");
                      }}
                      className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
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
                    <p className="mt-5 text-center text-xs text-muted-foreground">
                      {textoPixRodape}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fechar}
                    className="mt-7 h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
                  >
                    Já paguei
                  </button>
                </Passo>
              )}

              {etapa === "pendente" && (
                <Passo key="pendente">
                  <div className="flex flex-col items-center gap-4 py-16 text-center">
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
                      onClick={fechar}
                      className="mt-2 h-11 rounded-xl border border-border bg-card px-6 text-sm font-medium text-foreground"
                    >
                      Fechar
                    </button>
                  </div>
                </Passo>
              )}

              {etapa === "sucesso" && (
                <Passo key="sucesso">
                  <div className="flex flex-col items-center gap-4 py-16 text-center">
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
                      <p className="mt-1 text-sm text-muted-foreground">{textoSucesso}</p>
                    </div>
                  </div>
                </Passo>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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

function ValorGrande({ total, legenda }: { total: number; legenda: string }) {
  return (
    <div className="text-center">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {legenda}
      </p>
      <p className="mt-1 font-mono text-4xl font-bold tabular-nums text-foreground">
        {formatarPreco(total)}
      </p>
    </div>
  );
}
