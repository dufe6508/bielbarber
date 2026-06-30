"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Loader2, MessageCircle, Wallet } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useBooking } from "@/lib/store/booking";
import { ativarPush } from "@/lib/notifications/subscribe-client";
import { formatarPreco, telefoneNumeros } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { StepServicos } from "./StepServicos";
import { StepHorario } from "./StepHorario";
import { StepPagamento } from "./StepPagamento";
import { StepIdentificacao } from "./StepIdentificacao";
import { TicketConfirmacao } from "./TicketConfirmacao";
import { PagamentoDrawer } from "@/components/PagamentoDrawer";

const PASSOS = [
  { titulo: "Serviços", descricao: "O que você quer fazer" },
  { titulo: "Horário", descricao: "Dia e hora" },
  { titulo: "Seus dados", descricao: "Nome e telefone" },
  { titulo: "Pagamento", descricao: "Como prefere pagar" },
] as const;

const TOTAL_PASSOS = PASSOS.length;

export function BookingStepper({ limite }: { limite: string }) {
  const booking = useBooking();
  const { passo, avancar, voltar, irPara } = booking;
  const [enviando, setEnviando] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [cobrancaPendente, setCobrancaPendente] = useState(false);
  const [pagamento, setPagamento] = useState<{ chargeId: string; valor: number } | null>(null);
  const { preselecionar } = booking;

  // Deep link: /?servico=<slug|id> → pré-seleciona o serviço e pula pro horário.
  // Contrato com Agent A: páginas /agendar/[slug] redirecionam para /?servico=<slug>.
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("servico");
    if (!slug) return;
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch("/api/servicos");
        if (!res.ok) return;
        const lista: {
          id: string;
          slug: string | null;
          nome: string;
          preco: string;
          slotsNecessarios?: number;
        }[] = await res.json();
        const s = lista.find((x) => x.slug === slug || x.id === slug);
        if (s && !cancelado) {
          preselecionar([
            {
              id: s.id,
              nome: s.nome,
              preco: Number(s.preco),
              slotsNecessarios: s.slotsNecessarios,
            },
          ]);
        }
      } catch {
        /* deep link inválido — segue fluxo normal */
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function podeAvancar(): boolean {
    switch (passo) {
      case 0:
        return booking.servicos.length > 0;
      case 1:
        if (!booking.data || !booking.horario) return false;
        if (booking.slotsNecessarios() === 2 && !booking.horarioFim)
          return false;
        return true;
      case 2:
        return (
          booking.nome.trim().length >= 2 &&
          telefoneNumeros(booking.telefone).length >= 10
        );
      case 3:
        if (!booking.formaPagamento) return false;
        // Mensalista só avança se o telefone foi verificado
        if (booking.formaPagamento === "mensalista") return !!booking.mensalista;
        return true;
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
          horarioFim: booking.horarioFim,
          formaPagamento: booking.formaPagamento,
          servicoIds: booking.servicos.map((s) => s.id),
        }),
      });

      const dados = await res.json();
      if (!res.ok) {
        // Telefone bloqueado → tela dedicada (não expõe o motivo)
        if (res.status === 403 && dados.bloqueado) {
          setBloqueado(true);
          return;
        }
        // Mensalidade pendente → tela pedindo o pagamento
        if (res.status === 403 && dados.cobrancaPendente) {
          setCobrancaPendente(true);
          return;
        }
        toast.error(dados.error ?? "Não foi possível agendar. Tente de novo.");
        return;
      }

      // Push best-effort: pede permissão e registra a assinatura sem travar o fluxo.
      void ativarPush(telefoneNumeros(booking.telefone));
      // Pagamento online (pix/cartão): abre o checkout antes do ticket. Sem
      // chargeId (local/mensalista) vai direto pro ticket.
      if (dados.chargeId) {
        setPagamento({ chargeId: dados.chargeId, valor: dados.valor });
      } else {
        avancar();
      }
    } catch {
      toast.error("Erro de conexão. Verifique sua internet.");
    } finally {
      setEnviando(false);
    }
  }

  // Telefone bloqueado — tela calma, sem expor o motivo
  if (bloqueado) {
    // ponytail: número placeholder — trocar pelo WhatsApp real da barbearia
    const WHATSAPP = "5531999999999";
    return (
      <div className="mx-auto w-full max-w-md px-5 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="rounded-2xl border border-border bg-card p-8 text-center"
        >
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <MessageCircle className="size-7" />
          </span>
          <h1 className="mt-5 font-heading text-2xl font-semibold tracking-tight text-foreground">
            Não foi possível concluir
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Houve um problema com este agendamento. Fale com a barbearia pelo
            WhatsApp para resolver.
          </p>
          <a
            href={`https://wa.me/${WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-[transform,filter] hover:brightness-[1.10] active:scale-[0.98]"
          >
            <MessageCircle className="size-4" />
            Falar no WhatsApp
          </a>
        </motion.div>
      </div>
    );
  }

  // Mensalidade pendente — pede o pagamento antes de liberar novo agendamento
  if (cobrancaPendente) {
    return (
      <div className="mx-auto w-full max-w-md px-5 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-8 text-center dark:border-amber-400/25"
        >
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Wallet className="size-7" />
          </span>
          <h1 className="mt-5 font-heading text-2xl font-semibold tracking-tight text-foreground">
            Mensalidade pendente
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Você tem uma mensalidade em aberto. Quite o pagamento para liberar
            novos agendamentos.
          </p>
          <Link
            href="/mensalista"
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-[transform,filter] hover:brightness-[1.10] active:scale-[0.98]"
          >
            <Wallet className="size-4" />
            Pagar mensalidade
          </Link>
          <button
            type="button"
            onClick={() => setCobrancaPendente(false)}
            className="mt-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Voltar
          </button>
        </motion.div>
      </div>
    );
  }

  // Tela final — ticket (online não retorna código; basta ter chegado ao passo 4)
  if (passo === 4) {
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
        {passo === 1 && <StepHorario limite={limite} />}
        {passo === 2 && <StepIdentificacao />}
        {passo === 3 && <StepPagamento />}
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
        className="group inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-[transform,filter] hover:brightness-[1.10] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {enviando ? (
          <Loader2 className="size-4 animate-spin" />
        ) : ultimoPasso ? (
          "Confirmar agendamento"
        ) : (
          <>
            Continuar
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
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
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
            >
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={false}
                animate={{ scaleX: i <= passo ? 1 : 0 }}
                style={{ originX: 0 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              />
            </div>
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
            <h1 className="font-heading text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground">
              Agendar
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
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
                  {booking.extras.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-baseline justify-between gap-2 text-sm"
                    >
                      <span className="text-foreground">
                        {e.qtd}× {e.nome}
                      </span>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {formatarPreco(e.preco * e.qtd)}
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
            <motion.span
              key={booking.valorTotal()}
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="font-mono text-lg font-bold tabular-nums text-foreground"
            >
              {formatarPreco(booking.valorTotal())}
            </motion.span>
          </div>
        )}
        {barraAcao}
      </div>

      {/* Checkout online (pix/cartão) — ao fechar, segue pro ticket */}
      {pagamento && (
        <PagamentoDrawer
          open
          onOpenChange={(v) => {
            if (!v) {
              setPagamento(null);
              avancar();
            }
          }}
          total={pagamento.valor}
          chargeId={pagamento.chargeId}
          legenda="Agendamento · Biel Barber"
          textoPixRodape="Assim que o Pix cair, seu horário fica confirmado."
          tituloSucesso="Pagamento confirmado"
          textoSucesso="Tudo certo! Seu horário está garantido."
        />
      )}
    </div>
  );
}
