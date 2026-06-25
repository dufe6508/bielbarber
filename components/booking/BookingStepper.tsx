"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useBooking } from "@/lib/store/booking";
import { formatarPreco, telefoneNumeros } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { StepServicos } from "./StepServicos";
import { StepHorario } from "./StepHorario";
import { StepPagamento } from "./StepPagamento";
import { StepIdentificacao } from "./StepIdentificacao";
import { TicketConfirmacao } from "./TicketConfirmacao";

const PASSOS = [
  { titulo: "Serviços", descricao: "O que você quer fazer" },
  { titulo: "Horário", descricao: "Dia e hora" },
  { titulo: "Pagamento", descricao: "Como prefere pagar" },
  { titulo: "Seus dados", descricao: "Nome e telefone" },
] as const;

const TOTAL_PASSOS = PASSOS.length;

export function BookingStepper() {
  const booking = useBooking();
  const { passo, avancar, voltar, irPara } = booking;
  const [enviando, setEnviando] = useState(false);
  const [codigo, setCodigo] = useState<string | null>(null);

  function podeAvancar(): boolean {
    switch (passo) {
      case 0:
        return booking.servicos.length > 0;
      case 1:
        return !!booking.data && !!booking.horario;
      case 2:
        if (!booking.formaPagamento) return false;
        // Mensalista só avança se o telefone foi verificado
        if (booking.formaPagamento === "mensalista") return !!booking.mensalista;
        return true;
      case 3:
        return (
          booking.nome.trim().length >= 2 &&
          telefoneNumeros(booking.telefone).length >= 10
        );
      default:
        return false;
    }
  }

  async function confirmar() {
    setEnviando(true);
    try {
      const res = await fetch("/api/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: booking.nome.trim(),
          telefone: telefoneNumeros(booking.telefone),
          data: booking.data,
          horario: booking.horario,
          formaPagamento: booking.formaPagamento,
          servicoIds: booking.servicos.map((s) => s.id),
        }),
      });

      const dados = await res.json();
      if (!res.ok) {
        toast.error(dados.error ?? "Não foi possível agendar. Tente de novo.");
        return;
      }

      setCodigo(dados.codigo);
      avancar();
    } catch {
      toast.error("Erro de conexão. Verifique sua internet.");
    } finally {
      setEnviando(false);
    }
  }

  // Tela final — ticket
  if (passo === 4 && codigo) {
    return (
      <div className="mx-auto w-full max-w-md px-5 py-8 md:py-16">
        <TicketConfirmacao />
      </div>
    );
  }

  const ultimoPasso = passo === TOTAL_PASSOS - 1;
  const temServicos = booking.servicos.length > 0;

  const conteudo = (
    <AnimatePresence mode="wait">
      <motion.div
        key={passo}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      >
        {passo === 0 && <StepServicos />}
        {passo === 1 && <StepHorario />}
        {passo === 2 && <StepPagamento />}
        {passo === 3 && <StepIdentificacao />}
      </motion.div>
    </AnimatePresence>
  );

  const barraAcao = (
    <div className="flex items-center gap-3">
      {passo > 0 && (
        <button
          type="button"
          onClick={voltar}
          disabled={enviando}
          className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-medium text-foreground transition-[transform,background-color] hover:bg-muted active:scale-[0.98] disabled:opacity-50"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </button>
      )}
      <button
        type="button"
        onClick={ultimoPasso ? confirmar : avancar}
        disabled={!podeAvancar() || enviando}
        className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {enviando ? (
          <Loader2 className="size-4 animate-spin" />
        ) : ultimoPasso ? (
          "Confirmar agendamento"
        ) : (
          <>
            Continuar
            <ArrowRight className="size-4" />
          </>
        )}
      </button>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 md:px-8 md:py-12">
      {/* ─── Mobile: barras de progresso ─── */}
      <div className="mb-6 md:hidden">
        <div className="flex gap-1.5">
          {PASSOS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= passo ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
        <p className="mt-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Passo {passo + 1} de {TOTAL_PASSOS}
        </p>
      </div>

      <div className="md:grid md:grid-cols-[260px_1fr] md:gap-10">
        {/* ─── Desktop: stepper vertical ─── */}
        <div className="hidden md:block">
          <div className="sticky top-12">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              Agendar
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Rápido, sem cadastro.
            </p>

            <ol className="mt-8 space-y-1">
              {PASSOS.map((p, i) => {
                const concluido = i < passo;
                const ativo = i === passo;
                return (
                  <li key={p.titulo}>
                    <button
                      type="button"
                      disabled={i > passo}
                      onClick={() => i < passo && irPara(i)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        ativo && "bg-accent",
                        concluido && "hover:bg-muted",
                        i > passo && "cursor-default"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                          ativo && "bg-primary text-primary-foreground",
                          concluido && "bg-primary/15 text-primary",
                          i > passo &&
                            "border border-border text-muted-foreground"
                        )}
                      >
                        {concluido ? (
                          <Check className="size-3.5" strokeWidth={3} />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block text-sm font-medium",
                            ativo || concluido
                              ? "text-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {p.titulo}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {p.descricao}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {/* Resumo */}
            {temServicos && (
              <div className="mt-8 rounded-xl border border-border bg-card p-4">
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Resumo
                </p>
                <div className="mt-3 space-y-1.5">
                  {booking.servicos.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-baseline justify-between gap-2 text-sm"
                    >
                      <span className="text-foreground">{s.nome}</span>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {formatarPreco(s.preco)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-baseline justify-between border-t border-dashed border-border pt-3">
                  <span className="text-sm font-medium text-foreground">
                    Total
                  </span>
                  <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                    {formatarPreco(booking.valorTotal())}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Conteúdo do passo ─── */}
        <div className="min-w-0">
          <div className="md:rounded-2xl md:border md:border-border md:bg-card md:p-8">
            {conteudo}

            {/* Desktop: barra de ação dentro do painel */}
            <div className="mt-8 hidden border-t border-border pt-6 md:block">
              {barraAcao}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Mobile: barra de ação fixa ─── */}
      <div className="sticky bottom-0 z-10 mt-6 -mx-5 border-t border-border bg-background/95 px-5 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
        {temServicos && (
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-mono text-lg font-bold tabular-nums text-foreground">
              {formatarPreco(booking.valorTotal())}
            </span>
          </div>
        )}
        {barraAcao}
      </div>
    </div>
  );
}
