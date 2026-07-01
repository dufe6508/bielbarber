"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Loader2,
  Wallet,
  CalendarClock,
  Scissors,
  AlertTriangle,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PagamentoDrawer } from "@/components/PagamentoDrawer";
import { Input } from "@/components/ui/input";
import {
  formatarTelefone,
  telefoneNumeros,
  formatarData,
  formatarPreco,
} from "@/lib/utils/format";
import { lembrarTelefone, telefoneLembrado } from "@/lib/utils/telefone";
import { cn } from "@/lib/utils";

type Servico = { nome: string; preco: string };
type Corte = {
  id: string;
  data: string;
  horarioInicio: string;
  valorTotal: string;
  servicos: Servico[];
};
type Resultado =
  | { mensalista: false; nome: string }
  | {
      mensalista: true;
      nome: string;
      diaCobranca: number;
      proximaCobranca: string | null;
      agendamentos: Corte[];
      total: number;
    };

type Aberta = {
  id: string;
  valor: string;
  status: "pendente" | "vencido";
  vencimento: string | null;
  descricao: string | null;
};
type ItemHistorico = {
  id: string;
  valor: string;
  status: string;
  vencimento: string | null;
  metodo: string | null;
  pagoEm: string | null;
  comprovanteUrl: string | null;
  criadoEm: string;
};
type CobrancaCliente = { nome: string; aberta: Aberta | null; historico: ItemHistorico[] };

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
  expirado: "Expirado",
};
const METODO_LABEL: Record<string, string> = {
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  dinheiro: "Dinheiro",
  outro: "Outro",
};

export default function MensalistaPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [telefone, setTelefone] = useState("");
  const [pagar, setPagar] = useState(false);
  const [cobranca, setCobranca] = useState<CobrancaCliente | null>(null);

  const busca = useMutation<Resultado, Error, string>({
    mutationFn: async (tel: string) => {
      const res = await fetch(`/api/mensalistas/${tel}`);
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.error ?? "Erro ao buscar.");
      return dados;
    },
  });

  async function carregarCobrancas(tel: string) {
    try {
      const res = await fetch(`/api/cobrancas/${tel}`);
      if (!res.ok) {
        setCobranca(null);
        return;
      }
      setCobranca(await res.json());
    } catch {
      setCobranca(null);
    }
  }

  // Lida com redirect do Mercado Pago (back_urls)
  useEffect(() => {
    const pago = searchParams.get("pago");
    const pendente = searchParams.get("pendente");
    const falhou = searchParams.get("falhou");
    if (pago) {
      toast.success("Pagamento confirmado!", { description: "Mensalidade quitada." });
      router.replace("/mensalista");
    } else if (pendente) {
      toast.info("Pagamento em análise.", { description: "Você será avisado quando confirmar." });
      router.replace("/mensalista");
    } else if (falhou) {
      toast.error("Pagamento não aprovado.", { description: "Tente novamente ou use outro método." });
      router.replace("/mensalista");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pré-preenche (e já entra) com o telefone usado no agendamento
  useEffect(() => {
    const t = telefoneLembrado();
    if (t) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill do telefone lembrado no mount
      setTelefone(formatarTelefone(t));
      busca.mutate(t);
      carregarCobrancas(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const tel = telefoneNumeros(telefone);
    if (tel.length < 10) return;
    lembrarTelefone(tel);
    busca.mutate(tel);
    carregarCobrancas(tel);
  }

  const podeBuscar = telefoneNumeros(telefone).length >= 10;
  const r = busca.data;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-6 pb-28 md:px-8 md:py-12 md:pb-12">
      <PageHeader
        titulo="Mensalista"
        descricao="Acompanhe seus cortes do mês e pague a mensalidade. Digite seu telefone para entrar."
      />

      <form onSubmit={buscar} className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="(31) 99999-9999"
          value={telefone}
          onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
          className="h-12 font-mono text-base tabular-nums sm:flex-1"
        />
        <button
          type="submit"
          disabled={!podeBuscar || busca.isPending}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busca.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          Entrar
        </button>
      </form>

      {/* Erro / não encontrado */}
      {busca.isError && (
        <EstadoVazio
          icone={Search}
          titulo={busca.error.message}
          texto="Confira o número e tente de novo."
        />
      )}

      {/* Não é mensalista */}
      {r && r.mensalista === false && (
        <EstadoVazio
          icone={Wallet}
          titulo={`Olá, ${r.nome.split(" ")[0]}`}
          texto="Você ainda não é mensalista. Fale com a barbearia para ativar seu plano pós-pago."
        />
      )}

      {/* Mensalista — ciclo */}
      {r && r.mensalista === true && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="mt-10"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                Ciclo aberto de{" "}
                <span className="font-medium text-foreground">{r.nome}</span>
              </p>
              <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarClock className="size-4" />
                Fecha dia {r.diaCobranca}
                {r.proximaCobranca && (
                  <span className="font-mono tabular-nums">
                    · {formatarData(r.proximaCobranca)}
                  </span>
                )}
              </div>
            </div>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary">
              {r.agendamentos.length}{" "}
              {r.agendamentos.length === 1 ? "corte" : "cortes"}
            </span>
          </div>

          {/* Cobrança em aberto — CTA principal de pagamento (compacto) */}
          {cobranca?.aberta && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "mt-6 overflow-hidden rounded-2xl border p-4 shadow-sm",
                cobranca.aberta.status === "vencido"
                  ? "border-amber-500/40 bg-amber-500/[0.07] dark:border-amber-400/30 dark:bg-amber-400/[0.08]"
                  : "border-border bg-card"
              )}
            >
              {/* Título + valor na mesma linha — economiza altura */}
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  {cobranca.aberta.status === "vencido" ? (
                    <AlertTriangle className="size-5" />
                  ) : (
                    <Wallet className="size-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-sm font-semibold text-foreground">
                    {cobranca.aberta.status === "vencido"
                      ? "Mensalidade vencida"
                      : "Mensalidade pendente"}
                  </p>
                  {cobranca.aberta.vencimento && (
                    <p className="text-[11px] text-muted-foreground">
                      Vence {formatarData(cobranca.aberta.vencimento)}
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-mono text-xl font-bold tabular-nums text-foreground">
                  {formatarPreco(cobranca.aberta.valor)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPagar(true)}
                className="mt-3.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md active:scale-[0.97]"
              >
                <Wallet className="size-4" />
                Efetuar pagamento
              </button>
            </motion.div>
          )}

          {r.agendamentos.length === 0 ? (
            <EstadoVazio
              icone={Scissors}
              titulo="Nenhum corte neste ciclo"
              texto="Quando você cortar, os atendimentos aparecem aqui."
            />
          ) : (
            <>
              {/* Lista de cortes — como um "carrinho" do ciclo */}
              <motion.ul
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.05 } } }}
                className="mt-5 space-y-2"
              >
                {r.agendamentos.map((c) => (
                  <motion.li
                    key={c.id}
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      show: { opacity: 1, y: 0 },
                    }}
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 320, damping: 26 }}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-xs transition-shadow duration-300 hover:shadow-sm"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Scissors className="size-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {c.servicos.map((s) => s.nome).join(", ")}
                      </p>
                      <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                        {formatarData(c.data)} · {c.horarioInicio}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-foreground">
                      {formatarPreco(c.valorTotal)}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>

              {/* Total + pagar — peça focal, elevação maior */}
              <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total do ciclo
                  </span>
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={r.total}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-mono text-2xl font-bold tabular-nums text-foreground"
                    >
                      {formatarPreco(r.total)}
                    </motion.span>
                  </AnimatePresence>
                </div>
                {/* Sem cobrança formal ainda: o ciclo segue aberto até o fechamento. */}
                {!cobranca?.aberta && (
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    A cobrança é gerada no dia do fechamento. Você será avisado
                    quando puder pagar.
                  </p>
                )}
              </div>
            </>
          )}

          {/* Histórico de pagamentos */}
          {cobranca && cobranca.historico.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 flex items-center gap-1.5 font-heading text-sm font-semibold text-foreground">
                <Receipt className="size-4 text-muted-foreground" />
                Histórico de cobranças
              </h2>
              <ul className="space-y-2">
                {cobranca.historico.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-xs"
                  >
                    <span
                      className={cn(
                        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
                        h.status === "pago"
                          ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {h.status === "pago" ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        <Wallet className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {STATUS_LABEL[h.status] ?? h.status}
                        {h.metodo && (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {METODO_LABEL[h.metodo] ?? h.metodo}
                          </span>
                        )}
                      </p>
                      <p className="font-mono text-xs tabular-nums text-muted-foreground">
                        {h.pagoEm
                          ? `Pago ${formatarData(h.pagoEm)}`
                          : h.vencimento
                            ? `Vence ${formatarData(h.vencimento)}`
                            : formatarData(h.criadoEm)}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-foreground">
                      {formatarPreco(h.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <PagamentoDrawer
            open={pagar}
            onOpenChange={setPagar}
            total={cobranca?.aberta ? Number(cobranca.aberta.valor) : r.total}
            chargeId={cobranca?.aberta?.id}
            vencimento={cobranca?.aberta?.vencimento}
            descricao={cobranca?.aberta?.descricao}
            onPago={() => {
              const tel = telefoneNumeros(telefone);
              if (tel.length >= 10) carregarCobrancas(tel);
            }}
          />
        </motion.div>
      )}
    </div>
  );
}

function EstadoVazio({
  icone: Icone,
  titulo,
  texto,
}: {
  icone: React.ElementType;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="mt-8 flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-border py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icone className="size-5" />
      </span>
      <p className="text-sm font-medium text-foreground">{titulo}</p>
      <p className="max-w-xs text-[13px] text-muted-foreground">{texto}</p>
    </div>
  );
}
