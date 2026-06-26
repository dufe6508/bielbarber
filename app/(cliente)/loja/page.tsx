"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { Minus, Plus, ShoppingBag, Package as PackageIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { formatarPreco } from "@/lib/utils/format";

type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: string;
  precoAntigo: string | null;
  quantidadeEstoque: number;
  urlImagem: string | null;
};

export default function LojaPage() {
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const reduzir = useReducedMotion();

  const gridVariants: Variants = {
    show: { transition: { staggerChildren: reduzir ? 0 : 0.05 } },
  };
  const cardVariants: Variants = reduzir
    ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 16 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] },
        },
      };

  const { data, isLoading, isError } = useQuery<Produto[]>({
    queryKey: ["produtos"],
    queryFn: async () => {
      const res = await fetch("/api/produtos");
      if (!res.ok) throw new Error("Erro ao carregar produtos");
      return res.json();
    },
  });

  function ajustar(id: string, delta: number, estoque: number) {
    setCarrinho((prev) => {
      const atual = prev[id] ?? 0;
      const proximo = Math.max(0, Math.min(estoque, atual + delta));
      const novo = { ...prev };
      if (proximo === 0) delete novo[id];
      else novo[id] = proximo;
      return novo;
    });
  }

  const { totalItens, totalPreco } = useMemo(() => {
    let itens = 0;
    let preco = 0;
    for (const p of data ?? []) {
      const qtd = carrinho[p.id] ?? 0;
      itens += qtd;
      preco += qtd * Number(p.preco);
    }
    return { totalItens: itens, totalPreco: preco };
  }, [carrinho, data]);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 pb-28 md:px-8 md:py-12 md:pb-12">
      <PageHeader
        titulo="Loja"
        descricao="Reserve seus produtos e retire na hora do corte. O pagamento é feito na barbearia."
      />

      {isError && (
        <p className="mt-8 rounded-xl bg-destructive/10 p-4 text-center text-sm text-destructive">
          Não foi possível carregar os produtos. Recarregue a página.
        </p>
      )}

      {isLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate="show"
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {data.map((p) => {
            const qtd = carrinho[p.id] ?? 0;
            const semEstoque = p.quantidadeEstoque <= 0;
            return (
              <motion.article
                key={p.id}
                variants={cardVariants}
                whileHover={reduzir ? undefined : { y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Imagem / placeholder */}
                <div className="relative aspect-[4/3] bg-muted">
                  {p.urlImagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.urlImagem}
                      alt={p.nome}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground/40">
                      <PackageIcon className="size-10" strokeWidth={1.5} aria-hidden="true" />
                    </div>
                  )}
                  {semEstoque ? (
                    <span className="absolute right-3 top-3 rounded-full bg-foreground/85 px-2.5 py-1 text-[11px] font-medium text-background">
                      Esgotado
                    </span>
                  ) : (
                    p.precoAntigo && (
                      <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm">
                        Promo
                      </span>
                    )
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex flex-1 flex-col p-4">
                  <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                    {p.nome}
                  </h2>
                  {p.descricao && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {p.descricao}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="flex items-baseline gap-2">
                      {p.precoAntigo && (
                        <span className="font-mono text-sm tabular-nums text-muted-foreground line-through">
                          {formatarPreco(p.precoAntigo)}
                        </span>
                      )}
                      <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                        {formatarPreco(p.preco)}
                      </span>
                    </span>

                    {qtd === 0 ? (
                      <button
                        type="button"
                        disabled={semEstoque}
                        onClick={() => ajustar(p.id, 1, p.quantidadeEstoque)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-transform active:scale-95 disabled:opacity-40"
                      >
                        <Plus className="size-4" aria-hidden="true" />
                        Adicionar
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-1 rounded-lg border border-border p-1">
                        <button
                          type="button"
                          aria-label="Remover um"
                          onClick={() => ajustar(p.id, -1, p.quantidadeEstoque)}
                          className="flex size-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
                        >
                          <Minus className="size-4" aria-hidden="true" />
                        </button>
                        <span className="w-6 text-center font-mono text-sm font-semibold tabular-nums">
                          {qtd}
                        </span>
                        <button
                          type="button"
                          aria-label="Adicionar um"
                          disabled={qtd >= p.quantidadeEstoque}
                          onClick={() => ajustar(p.id, 1, p.quantidadeEstoque)}
                          className="flex size-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted disabled:opacity-30"
                        >
                          <Plus className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      ) : (
        <EmptyLoja />
      )}

      {/* Barra de reserva (carrinho) */}
      <AnimatePresence>
        {totalItens > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-20 px-5 md:bottom-6 md:left-64 md:px-8"
          >
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
                <ShoppingBag className="size-5" aria-hidden="true" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-medium text-foreground">
                  {totalItens} {totalItens === 1 ? "item" : "itens"}
                </p>
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  {formatarPreco(totalPreco)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                toast.success("Reserva registrada! Retire na hora do corte.", {
                  description: "Você paga na barbearia.",
                })
              }
              className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
            >
              Reservar
            </button>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyLoja() {
  return (
    <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ShoppingBag className="size-6" aria-hidden="true" />
      </span>
      <p className="font-medium text-foreground">Nenhum produto por aqui ainda</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Em breve a barbearia vai disponibilizar produtos para reserva.
      </p>
    </div>
  );
}
