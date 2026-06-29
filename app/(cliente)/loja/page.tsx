"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import {
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Package as PackageIcon,
} from "lucide-react";
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

type Voo = { key: number; x: number; y: number; tx: number; ty: number; img: string | null };

export default function LojaPage() {
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [voos, setVoos] = useState<Voo[]>([]);
  const carrinhoRef = useRef<HTMLSpanElement>(null);
  const vooSeq = useRef(0);
  const reduzir = useReducedMotion();

  const gridVariants: Variants = {
    show: { transition: { staggerChildren: reduzir ? 0 : 0.035 } },
  };
  const cardVariants: Variants = reduzir
    ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 12 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] },
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

  // Adiciona + dispara o "voo" do produto até o carrinho
  function adicionar(e: React.MouseEvent<HTMLButtonElement>, p: Produto) {
    if (p.quantidadeEstoque <= (carrinho[p.id] ?? 0)) return;
    ajustar(p.id, 1, p.quantidadeEstoque);
    if (reduzir) return;

    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const alvo = carrinhoRef.current?.getBoundingClientRect();
    const tx = alvo ? alvo.left + alvo.width / 2 : window.innerWidth * 0.14;
    const ty = alvo ? alvo.top + alvo.height / 2 : window.innerHeight - 64;

    const key = ++vooSeq.current;
    setVoos((v) => [...v, { key, x, y, tx, ty, img: p.urlImagem }]);
    window.setTimeout(() => setVoos((v) => v.filter((it) => it.key !== key)), 720);
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
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="aspect-square animate-pulse bg-muted" />
              <div className="space-y-1.5 p-2.5">
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate="show"
          className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3"
        >
          {data.map((p) => {
            const qtd = carrinho[p.id] ?? 0;
            const semEstoque = p.quantidadeEstoque <= 0;
            const poucoEstoque = !semEstoque && p.quantidadeEstoque <= 5;
            return (
              <motion.article
                key={p.id}
                variants={cardVariants}
                whileTap={reduzir ? undefined : { scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 26 }}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md hover:shadow-primary/5"
              >
                {/* Imagem / placeholder */}
                <div className="relative aspect-square bg-muted">
                  {p.urlImagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.urlImagem}
                      alt={p.nome}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground/40">
                      <PackageIcon className="size-9" strokeWidth={1.5} aria-hidden="true" />
                    </div>
                  )}

                  {/* Badges — top-left */}
                  <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
                    {semEstoque ? (
                      <span className="rounded-full bg-foreground/85 px-2 py-0.5 text-[10px] font-medium text-background backdrop-blur">
                        Esgotado
                      </span>
                    ) : (
                      <>
                        {p.precoAntigo && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm">
                            Promo
                          </span>
                        )}
                        {poucoEstoque && (
                          <span className="rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur">
                            Últimas {p.quantidadeEstoque}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Add / Stepper — overlapping bottom-right (thumb zone) */}
                  <div className="absolute bottom-1.5 right-1.5">
                    {qtd === 0 ? (
                      <motion.button
                        type="button"
                        disabled={semEstoque}
                        onClick={(e) => adicionar(e, p)}
                        aria-label={`Adicionar ${p.nome}`}
                        whileTap={{ scale: 0.85 }}
                        transition={{ type: "spring", stiffness: 600, damping: 18 }}
                        className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-background/20 disabled:opacity-40"
                      >
                        <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
                      </motion.button>
                    ) : (
                      <motion.div
                        layout
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 28 }}
                        className="flex items-center rounded-full bg-background/85 p-0.5 shadow-lg ring-1 ring-border backdrop-blur-md"
                      >
                        <button
                          type="button"
                          aria-label="Remover um"
                          onClick={() => ajustar(p.id, -1, p.quantidadeEstoque)}
                          className="flex size-7 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted active:scale-90"
                        >
                          <Minus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                        </button>
                        <motion.span
                          key={qtd}
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 600, damping: 20 }}
                          className="w-5 text-center font-mono text-sm font-bold tabular-nums text-foreground"
                        >
                          {qtd}
                        </motion.span>
                        <button
                          type="button"
                          aria-label="Adicionar um"
                          disabled={qtd >= p.quantidadeEstoque}
                          onClick={(e) => adicionar(e, p)}
                          className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-90 disabled:opacity-30"
                        >
                          <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Conteúdo — compacto */}
                <div className="flex flex-1 flex-col p-2.5">
                  <h2 className="truncate font-heading text-[13px] font-semibold leading-tight tracking-tight text-foreground">
                    {p.nome}
                  </h2>
                  {p.descricao && (
                    <p className="mt-0.5 line-clamp-1 text-[11px] leading-tight text-muted-foreground">
                      {p.descricao}
                    </p>
                  )}

                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                      {formatarPreco(p.preco)}
                    </span>
                    {p.precoAntigo && (
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground line-through">
                        {formatarPreco(p.precoAntigo)}
                      </span>
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
              <span
                ref={carrinhoRef}
                className="relative flex size-10 items-center justify-center rounded-xl bg-accent text-primary"
              >
                <motion.span
                  key={totalItens}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 16 }}
                  className="flex"
                >
                  <ShoppingCart className="size-5" aria-hidden="true" />
                </motion.span>
              </span>
              <div className="leading-tight">
                <motion.p
                  key={totalItens}
                  initial={{ scale: 0.8, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className="text-sm font-medium text-foreground"
                >
                  {totalItens} {totalItens === 1 ? "item" : "itens"}
                </motion.p>
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

      {/* Voo do produto até o carrinho */}
      <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
        <AnimatePresence>
          {voos.map((v) => (
            <motion.div
              key={v.key}
              initial={{ x: v.x, y: v.y, scale: 1, opacity: 1 }}
              animate={{
                x: v.tx,
                y: [v.y, v.y - 70, v.ty],
                scale: 0.25,
                opacity: [1, 1, 0.2],
              }}
              transition={{ duration: 0.65, ease: [0.45, 0, 0.25, 1] }}
              style={{ position: "absolute", left: 0, top: 0, marginLeft: -22, marginTop: -22 }}
              className="size-11 overflow-hidden rounded-full border border-border bg-card shadow-xl shadow-primary/20"
            >
              {v.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.img} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center bg-primary text-primary-foreground">
                  <PackageIcon className="size-5" aria-hidden="true" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
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
