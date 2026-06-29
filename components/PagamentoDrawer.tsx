"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import { AnimatePresence, motion } from "motion/react";
import { QrCode, CreditCard, Check, Copy, Loader2, ArrowLeft, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { formatarPreco, formatarData } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Etapa = "escolha" | "pix" | "cartao" | "processando" | "sucesso";

const CODIGO_PIX_EXEMPLO =
  "00020126360014BR.GOV.BCB.PIX0114+5531988887777520400005303986540";

export function PagamentoDrawer({
  open,
  onOpenChange,
  total,
  onPago,
  chargeId,
  vencimento,
  descricao,
  barbearia = "Biel Barber",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  total: number;
  onPago?: () => void;
  // Quando vinculado a uma cobrança de mensalidade — habilita checkout MP real.
  chargeId?: string;
  vencimento?: string | null;
  descricao?: string | null;
  barbearia?: string;
}) {
  const [etapa, setEtapa] = useState<Etapa>("escolha");
  const [iniciando, setIniciando] = useState(false);

  // Reseta a etapa ao fechar (próxima abertura começa em "escolha")
  function handleOpenChange(v: boolean) {
    onOpenChange(v);
    if (!v) {
      setEtapa("escolha");
      setIniciando(false);
    }
  }

  // Tenta o checkout real do Mercado Pago. Se a credencial não estiver
  // configurada (ou a cobrança não for informada), cai no fluxo manual `metodo`.
  async function escolher(metodo: "pix" | "cartao") {
    if (!chargeId) {
      setEtapa(metodo);
      return;
    }
    setIniciando(true);
    try {
      const res = await fetch("/api/pagamentos/mercadopago/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chargeId }),
      });
      const dados = await res.json().catch(() => null);
      if (dados?.configurado && dados.initPoint) {
        window.location.href = dados.initPoint as string; // checkout MP
        return;
      }
      // Sem gateway ativo → instrução de pagamento manual.
      setEtapa(metodo);
    } catch {
      setEtapa(metodo);
    } finally {
      setIniciando(false);
    }
  }

  function processar() {
    setEtapa("processando");
    setTimeout(() => setEtapa("sucesso"), 1400);
    setTimeout(() => {
      handleOpenChange(false);
      onPago?.();
    }, 3000);
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
              {etapa === "escolha" && (
                <Passo key="escolha">
                  <CabecalhoValor
                    total={total}
                    legenda={chargeId ? `Mensalidade · ${barbearia}` : "Total a pagar"}
                  />
                  {/* Resumo da cobrança */}
                  {chargeId && (vencimento || descricao) && (
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
                  <p className="mb-4 mt-6 text-sm font-medium text-foreground">
                    Como você quer pagar?
                  </p>
                  <div className="space-y-3">
                    {iniciando ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" /> Abrindo pagamento…
                      </div>
                    ) : (
                      <>
                        <OpcaoPagamento
                          icone={QrCode}
                          titulo="Pix"
                          descricao="Aprovação na hora"
                          onClick={() => escolher("pix")}
                        />
                        <OpcaoPagamento
                          icone={CreditCard}
                          titulo="Cartão"
                          descricao="Crédito ou débito"
                          onClick={() => escolher("cartao")}
                        />
                      </>
                    )}
                  </div>
                </Passo>
              )}

              {etapa === "pix" && (
                <Passo key="pix">
                  <Voltar onClick={() => setEtapa("escolha")} />
                  <CabecalhoValor total={total} legenda="Pague via Pix" />
                  <div className="mt-6 flex flex-col items-center">
                    <div className="flex size-44 items-center justify-center rounded-2xl border border-border bg-card">
                      <QrCode className="size-24 text-foreground" strokeWidth={1} />
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      QR de exemplo. O gateway real entra na próxima fase.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(CODIGO_PIX_EXEMPLO);
                        toast.success("Código Pix copiado");
                      }}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
                    >
                      <Copy className="size-4" />
                      Copiar código Pix
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={processar}
                    className="mt-7 h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
                  >
                    Já fiz o pagamento
                  </button>
                </Passo>
              )}

              {etapa === "cartao" && (
                <Passo key="cartao">
                  <Voltar onClick={() => setEtapa("escolha")} />
                  <CabecalhoValor total={total} legenda="Pague com cartão" />
                  <div className="mt-6 space-y-3">
                    <CampoFake rotulo="Número do cartão" valor="0000 0000 0000 0000" />
                    <div className="grid grid-cols-2 gap-3">
                      <CampoFake rotulo="Validade" valor="MM/AA" />
                      <CampoFake rotulo="CVV" valor="000" />
                    </div>
                    <CampoFake rotulo="Nome no cartão" valor="Como está no cartão" />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Formulário de exemplo. O gateway real (Mercado Pago) entra na próxima fase.
                  </p>
                  <button
                    type="button"
                    onClick={processar}
                    className="mt-6 h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
                  >
                    Pagar {formatarPreco(total)}
                  </button>
                </Passo>
              )}

              {etapa === "processando" && (
                <Passo key="processando">
                  <div className="flex flex-col items-center gap-4 py-16">
                    <Loader2 className="size-10 animate-spin text-primary" />
                    <p className="text-sm font-medium text-foreground">
                      Processando pagamento...
                    </p>
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
                        Pagamento confirmado
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Mensalidade quitada. Até o próximo corte!
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

function OpcaoPagamento({
  icone: Icone,
  titulo,
  descricao,
  onClick,
}: {
  icone: React.ElementType;
  titulo: string;
  descricao: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-[transform,border-color] hover:border-primary/40 active:scale-[0.99]"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
        <Icone className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-foreground">{titulo}</span>
        <span className="block text-xs text-muted-foreground">{descricao}</span>
      </span>
    </button>
  );
}

function CampoFake({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{rotulo}</span>
      <div className="flex h-11 items-center rounded-lg border border-input bg-muted/40 px-3 font-mono text-sm text-muted-foreground/70">
        {valor}
      </div>
    </div>
  );
}

function Voltar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      )}
    >
      <ArrowLeft className="size-4" />
      Voltar
    </button>
  );
}
