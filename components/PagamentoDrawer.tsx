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
  AlertCircle,
  Smartphone,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { formatarPreco, formatarData } from "@/lib/utils/format";
import type { ResultadoCartao } from "@/components/MpCardBrick";

// Brick de cartão depende de `window` — carrega só no cliente.
const MpCardBrick = dynamic(
  () => import("@/components/MpCardBrick").then((m) => m.MpCardBrick),
  { ssr: false }
);

type Etapa = "metodo" | "pix" | "cartao" | "sucesso" | "pendente";
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
  const [etapa, setEtapa] = useState<Etapa>("metodo");
  const [pix, setPix] = useState<Pix | null>(null);
  const [gerandoPix, setGerandoPix] = useState(false);
  const [brickPronto, setBrickPronto] = useState(false);
  const [mostrarFallback, setMostrarFallback] = useState(false);
  const [redirecionando, setRedirecionando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Fallback após 8s se o brick de cartão não carregar (ex: adblocker).
  useEffect(() => {
    if (!open || etapa !== "cartao" || brickPronto) return;
    const t = setTimeout(() => setMostrarFallback(true), 8000);
    return () => clearTimeout(t);
  }, [open, etapa, brickPronto]);

  // Bloquear scroll do body quando modal aberto.
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function fechar() {
    onOpenChange(false);
    setTimeout(() => {
      setEtapa("metodo");
      setPix(null);
      setGerandoPix(false);
      setBrickPronto(false);
      setMostrarFallback(false);
    }, 300);
  }

  // Pix: gera o pagamento direto (sem Brick, sem campo de e-mail) e mostra o QR.
  async function escolherPix() {
    if (!chargeId || gerandoPix) return;
    setGerandoPix(true);
    try {
      const res = await fetch("/api/pagamentos/mercadopago/processar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chargeId, formData: { payment_method_id: "pix" } }),
        signal: AbortSignal.timeout(15_000),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d) {
        toast.error(d?.detalhe ?? d?.error ?? "Não foi possível gerar o Pix. Tente novamente.");
        return;
      }
      if (d.pix?.qrCode) {
        setPix({ qrCode: d.pix.qrCode, qrCodeBase64: d.pix.qrCodeBase64, ticketUrl: d.pix.ticketUrl });
        setEtapa("pix");
        return;
      }
      toast.error("Não foi possível gerar o Pix. Tente pelo cartão.");
    } catch {
      toast.error("Falha ao gerar o Pix. Verifique sua conexão.");
    } finally {
      setGerandoPix(false);
    }
  }

  function escolherCartao() {
    setBrickPronto(false);
    setMostrarFallback(false);
    setEtapa("cartao");
  }

  function handleCartaoResult(r: ResultadoCartao) {
    if (r.tipo === "aprovado") {
      setEtapa("sucesso");
      onPago?.();
      setTimeout(fechar, 2800);
      return;
    }
    setEtapa("pendente");
    onPago?.();
  }

  async function copiarPix() {
    if (!pix) return;
    await navigator.clipboard?.writeText(pix.qrCode);
    setCopiado(true);
    toast.success("Código Pix copiado!");
    setTimeout(() => setCopiado(false), 2500);
  }

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
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={fechar}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-[61] flex items-end justify-center sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative flex w-full flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl sm:max-w-md sm:rounded-3xl"
              style={{ maxHeight: "calc(100dvh - 40px)" }}
              initial={{ y: 60, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              {/* Drag handle (mobile) */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <div className="flex items-center gap-2">
                  {(etapa === "cartao" || etapa === "pix") ? (
                    <button
                      onClick={() => setEtapa("metodo")}
                      aria-label="Voltar"
                      className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <ArrowLeft className="size-4" />
                    </button>
                  ) : (
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                      <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
                    </span>
                  )}
                  <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Pagamento Seguro · {barbearia}
                  </span>
                </div>
                <button
                  onClick={fechar}
                  aria-label="Fechar"
                  className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Conteúdo com scroll */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">

                  {/* ── Etapa: escolha do método ── */}
                  {etapa === "metodo" && (
                    <Passo key="metodo">
                      <div className="px-5 pb-6 pt-6">
                        <ValorDestaque
                          total={total}
                          legenda={legenda ?? (descricao ?? `Pagamento · ${barbearia}`)}
                        />

                        {(vencimento || descricao) && (
                          <div className="mt-4 space-y-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
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

                        {chargeId ? (
                          <div className="mt-5 space-y-2.5">
                            <p className="px-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Como você prefere pagar?
                            </p>
                            <MetodoBotao
                              icone={<QrCode className="size-5" />}
                              titulo="Pix"
                              subtitulo="Na hora, com QR Code"
                              onClick={escolherPix}
                              loading={gerandoPix}
                            />
                            <MetodoBotao
                              icone={<CreditCard className="size-5" />}
                              titulo="Cartão"
                              subtitulo="Crédito, parcelamento disponível"
                              onClick={escolherCartao}
                              disabled={gerandoPix}
                            />
                          </div>
                        ) : (
                          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                            <AlertCircle className="size-4 shrink-0 text-destructive" />
                            Cobrança não encontrada.
                          </div>
                        )}
                      </div>
                    </Passo>
                  )}

                  {/* ── Etapa: formulário de cartão ── */}
                  {etapa === "cartao" && chargeId && (
                    <Passo key="cartao">
                      <div className="px-5 pb-6 pt-5">
                        <div className="mb-4 flex items-center justify-between">
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                            <CreditCard className="size-4 text-primary" /> Pagar com cartão
                          </span>
                          <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                            {formatarPreco(total)}
                          </span>
                        </div>

                        <div className="relative min-h-[220px]">
                          {!brickPronto && !mostrarFallback && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30">
                              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                                <Loader2 className="size-5 animate-spin text-primary" />
                              </div>
                              <p className="text-sm text-muted-foreground">Carregando formulário…</p>
                            </div>
                          )}
                          <MpCardBrick
                            amount={total}
                            chargeId={chargeId}
                            onReadyChange={setBrickPronto}
                            onResult={handleCartaoResult}
                            onErro={(msg) => {
                              if (msg) toast.error(msg);
                              setMostrarFallback(true);
                            }}
                          />
                        </div>

                        {mostrarFallback && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4"
                          >
                            <div className="flex items-start gap-3">
                              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  Formulário bloqueado
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Pode ser um bloqueador de anúncios. Pague com segurança pelo site do Mercado Pago.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={abrirCheckoutExterno}
                              disabled={redirecionando}
                              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                            >
                              {redirecionando ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <>
                                  Pagar no Mercado Pago <ExternalLink className="size-3.5" />
                                </>
                              )}
                            </button>
                          </motion.div>
                        )}
                      </div>
                    </Passo>
                  )}

                  {/* ── Etapa: QR Code Pix ── */}
                  {etapa === "pix" && pix && (
                    <Passo key="pix">
                      <div className="flex flex-col items-center px-5 pb-8 pt-6">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-[#00B37E]/10">
                          <Smartphone className="size-7 text-[#00B37E]" />
                        </div>
                        <h2 className="mt-3 text-base font-semibold text-foreground">Pague via Pix</h2>
                        <p className="mt-1 text-center text-sm text-muted-foreground">
                          Escaneie o QR Code ou copie o código abaixo
                        </p>

                        <div className="mt-4 rounded-xl bg-muted/50 px-5 py-2">
                          <span className="font-mono text-xl font-bold tabular-nums text-foreground">
                            {formatarPreco(total)}
                          </span>
                        </div>

                        {pix.qrCodeBase64 ? (
                          <div className="mt-5 rounded-2xl border-2 border-border bg-white p-3 shadow-md">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`data:image/png;base64,${pix.qrCodeBase64}`}
                              alt="QR Code Pix"
                              className="size-52"
                            />
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={copiarPix}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted active:scale-[0.98]"
                        >
                          <AnimatePresence mode="wait">
                            {copiado ? (
                              <motion.span
                                key="check"
                                initial={{ scale: 0.7, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.7, opacity: 0 }}
                                className="flex items-center gap-2 text-[#00B37E]"
                              >
                                <Check className="size-4" /> Copiado!
                              </motion.span>
                            ) : (
                              <motion.span
                                key="copy"
                                initial={{ scale: 0.7, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.7, opacity: 0 }}
                                className="flex items-center gap-2"
                              >
                                <Copy className="size-4" /> Copiar código Pix
                              </motion.span>
                            )}
                          </AnimatePresence>
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

                        <p className="mt-5 max-w-[280px] text-center text-xs text-muted-foreground">
                          {textoPixRodape}
                        </p>

                        <button
                          type="button"
                          onClick={fechar}
                          className="mt-5 h-11 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
                        >
                          Já paguei
                        </button>
                      </div>
                    </Passo>
                  )}

                  {/* ── Etapa: Em análise ── */}
                  {etapa === "pendente" && (
                    <Passo key="pendente">
                      <div className="flex flex-col items-center gap-4 px-5 py-12 text-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 280, damping: 18 }}
                          className="flex size-20 items-center justify-center rounded-full bg-amber-500/10"
                        >
                          <div className="flex size-14 items-center justify-center rounded-full bg-amber-500/20">
                            <Clock3 className="size-8 text-amber-500" />
                          </div>
                        </motion.div>
                        <div>
                          <p className="text-lg font-semibold text-foreground">Pagamento em análise</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Você será avisado assim que for confirmado.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={fechar}
                          className="mt-2 h-10 rounded-xl border border-border bg-card px-8 text-sm font-medium text-foreground transition-all hover:bg-muted"
                        >
                          Fechar
                        </button>
                      </div>
                    </Passo>
                  )}

                  {/* ── Etapa: Sucesso ── */}
                  {etapa === "sucesso" && (
                    <Passo key="sucesso">
                      <div className="flex flex-col items-center gap-4 px-5 py-12 text-center">
                        <motion.div
                          initial={{ scale: 0, rotate: -10 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 16 }}
                        >
                          <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
                            <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check className="size-8" strokeWidth={3} />
                            </div>
                          </div>
                        </motion.div>
                        <div>
                          <p className="text-lg font-semibold text-foreground">{tituloSucesso}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{textoSucesso}</p>
                        </div>
                      </div>
                    </Passo>
                  )}

                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function MetodoBotao({
  icone,
  titulo,
  subtitulo,
  onClick,
  loading,
  disabled,
}: {
  icone: React.ReactNode;
  titulo: string;
  subtitulo: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className="group flex w-full items-center gap-3.5 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-accent/40 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
        {loading ? <Loader2 className="size-5 animate-spin" /> : icone}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{titulo}</span>
        <span className="block text-xs text-muted-foreground">{subtitulo}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
    </button>
  );
}

function Passo({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}

function ValorDestaque({ total, legenda }: { total: number; legenda: string }) {
  return (
    <div className="text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{legenda}</p>
      <p className="mt-1.5 font-mono text-4xl font-bold tabular-nums text-foreground">
        {formatarPreco(total)}
      </p>
    </div>
  );
}
