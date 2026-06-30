"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import {
  Check,
  Package as PackageIcon,
  Layers,
  Hash,
  X,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PagamentoDrawer } from "@/components/PagamentoDrawer";
import { Input } from "@/components/ui/input";
import {
  formatarPreco,
  formatarTelefone,
  telefoneNumeros,
} from "@/lib/utils/format";
import { lembrarTelefone, telefoneLembrado, lembrarNome, nomeLembrado } from "@/lib/utils/telefone";

type PacoteServico = { servico: { id: string; nome: string } };
type PacoteProduto = { quantidade: number; produto: { id: string; nome: string } };

type Pacote = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: "quantidade" | "combo";
  preco: string;
  validadeDias: number | null;
  quantidadeTotal: number | null;
  servicos: PacoteServico[];
  produtos: PacoteProduto[];
};

export default function PacotesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reduzir = useReducedMotion();
  const [ativando, setAtivando] = useState<Pacote | null>(null);

  // Lida com redirect do Mercado Pago (back_urls)
  useEffect(() => {
    const pago = searchParams.get("pago");
    const pendente = searchParams.get("pendente");
    const falhou = searchParams.get("falhou");
    if (pago) {
      toast.success("Pacote ativado!", { description: "Seu pacote está liberado. É só agendar." });
      router.replace("/pacotes");
    } else if (pendente) {
      toast.info("Pagamento em análise.", { description: "O pacote será ativado assim que confirmar." });
      router.replace("/pacotes");
    } else if (falhou) {
      toast.error("Pagamento não aprovado.", { description: "Tente novamente ou use outro método." });
      router.replace("/pacotes");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading, isError } = useQuery<Pacote[]>({
    queryKey: ["pacotes"],
    queryFn: async () => {
      const res = await fetch("/api/pacotes");
      if (!res.ok) throw new Error("Erro ao carregar pacotes");
      return res.json();
    },
  });

  const gridVariants: Variants = {
    show: { transition: { staggerChildren: reduzir ? 0 : 0.05 } },
  };
  const cardVariants: Variants = reduzir
    ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 14 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] },
        },
      };

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 pb-24 md:px-8 md:py-12 md:pb-12">
      <PageHeader
        titulo="Pacotes"
        descricao="Combos de serviços e produtos com preço fechado. Mais praticidade na hora de agendar."
      />

      {isError && (
        <p className="mt-8 rounded-xl bg-destructive/10 p-4 text-center text-sm text-destructive">
          Não foi possível carregar os pacotes. Recarregue a página.
        </p>
      )}

      {isLoading ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
            >
              <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
              <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
              <div className="mt-2 space-y-2 border-t border-dashed border-border pt-4">
                <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
              </div>
              <div className="mt-auto h-8 w-1/3 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate="show"
          className="mt-8 grid gap-5 md:grid-cols-2"
        >
          {data.map((pkg) => {
            const TipoIcone = pkg.tipo === "combo" ? Layers : Hash;
            const itens = [
              ...pkg.servicos.map((s) => s.servico.nome),
              ...pkg.produtos.map(
                (p) =>
                  `${p.quantidade > 1 ? `${p.quantidade}x ` : ""}${p.produto.nome}`
              ),
            ];
            return (
              <motion.article
                key={pkg.id}
                variants={cardVariants}
                whileHover={reduzir ? undefined : { y: -5 }}
                whileTap={reduzir ? undefined : { scale: 0.99 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="group/pkg relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-[box-shadow,border-color] duration-300 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/[0.06]"
              >
                {/* Top accent — revela no hover */}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover/pkg:opacity-100"
                />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-primary">
                      <TipoIcone className="size-3.5" aria-hidden="true" />
                      {pkg.tipo === "combo" ? "Combo" : "Quantidade"}
                    </span>
                    <h2 className="mt-3 font-heading text-xl font-semibold tracking-tight text-foreground">
                      {pkg.nome}
                    </h2>
                    {pkg.descricao && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {pkg.descricao}
                      </p>
                    )}
                  </div>
                </div>

                {itens.length > 0 && (
                  <ul className="mt-5 space-y-2 border-t border-dashed border-border pt-5">
                    {itens.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2.5 text-sm text-foreground"
                      >
                        <Check
                          className="size-4 shrink-0 text-primary"
                          strokeWidth={2.5}
                          aria-hidden="true"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto flex items-end justify-between gap-4 pt-6">
                  <div>
                    <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
                      {formatarPreco(pkg.preco)}
                    </span>
                    {pkg.validadeDias && (
                      <p className="text-xs text-muted-foreground">
                        Válido por {pkg.validadeDias} dias
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setAtivando(pkg)}
                    className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md active:scale-[0.97]"
                  >
                    Quero esse
                  </button>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      ) : (
        <EmptyPacotes />
      )}

      <AnimatePresence>
        {ativando && (
          <AtivarPacoteModal pacote={ativando} onFechar={() => setAtivando(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Modal de ativação de pacote ────────────────────────────────────────────
type RespostaCobranca = {
  chargeId: string;
  pacote: string;
  valor: number;
};

function AtivarPacoteModal({
  pacote,
  onFechar,
}: {
  pacote: Pacote;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(() => nomeLembrado());
  const [telefone, setTelefone] = useState(() => {
    const t = telefoneLembrado();
    return t ? formatarTelefone(t) : "";
  });

  const ativar = useMutation<RespostaCobranca, Error, void>({
    mutationFn: async () => {
      const res = await fetch("/api/pacotes/ativar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pacoteId: pacote.id, nome, telefone }),
      });
      const dados = await res.json().catch(() => null);
      if (!res.ok || !dados) {
        throw new Error(dados?.error ?? "Não foi possível continuar. Tente novamente.");
      }
      return dados;
    },
    onSuccess: () => {
      lembrarTelefone(telefoneNumeros(telefone));
      lembrarNome(nome);
    },
  });

  const podeAtivar = nome.trim().length >= 2 && telefoneNumeros(telefone).length >= 10;
  const r = ativar.data;

  // Cobrança criada → checkout online (Pix/cartão). O pacote é ativado só quando
  // o pagamento confirma (cartão na hora, Pix via webhook).
  if (r) {
    return (
      <PagamentoDrawer
        open
        onOpenChange={(v) => {
          if (!v) onFechar();
        }}
        total={r.valor}
        chargeId={r.chargeId}
        descricao={r.pacote}
        legenda={`Pacote · ${r.pacote}`}
        textoPixRodape="Assim que o pagamento cair, seu pacote é ativado automaticamente."
        tituloSucesso="Pacote ativado!"
        textoSucesso={`${r.pacote} liberado. É só agendar.`}
      />
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onFechar}
        aria-label="Fechar"
      />
      <motion.div
        initial={{ y: "4%", opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: "3%", opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 360, damping: 32 }}
        className="relative w-full max-w-md rounded-t-2xl border border-border bg-card p-6 shadow-2xl sm:rounded-2xl"
      >
        <button
          onClick={onFechar}
          className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="size-4.5" />
        </button>

        <div className="space-y-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-primary">
              {pacote.tipo === "combo" ? "Combo" : "Quantidade"}
            </span>
            <h2 className="mt-3 font-heading text-xl font-semibold tracking-tight text-foreground">
              Ativar {pacote.nome}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {pacote.quantidadeTotal
                ? `${pacote.quantidadeTotal} cortes`
                : "Combo de serviços"}
              {pacote.validadeDias ? ` · válido por ${pacote.validadeDias} dias` : ""}. Você paga{" "}
              <span className="font-semibold text-foreground">
                {formatarPreco(pacote.preco)}
              </span>{" "}
              online (Pix ou cartão).
            </p>
          </div>

          <div className="space-y-3">
            <Input
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-12"
            />
            <Input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="(31) 99999-9999"
              value={telefone}
              onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
              className="h-12 font-mono tabular-nums"
            />
          </div>

          {ativar.isError && (
            <p className="text-sm text-destructive">{ativar.error.message}</p>
          )}

          <button
            onClick={() => ativar.mutate()}
            disabled={!podeAtivar || ativar.isPending}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40"
          >
            {ativar.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Ir para o pagamento"
            )}
          </button>
          <p className="text-center text-[11px] text-muted-foreground">
            Pagamento online seguro via Mercado Pago.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EmptyPacotes() {
  return (
    <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <PackageIcon className="size-6" aria-hidden="true" />
      </span>
      <p className="font-medium text-foreground">Nenhum pacote disponível ainda</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Em breve a barbearia vai montar combos de serviços e produtos para você.
      </p>
    </div>
  );
}
