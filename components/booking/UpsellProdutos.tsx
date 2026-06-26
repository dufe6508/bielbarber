"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Minus, Sparkles, Package as PackageIcon } from "lucide-react";
import { useBooking } from "@/lib/store/booking";
import { formatarPreco } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: string;
  precoAntigo: string | null;
  quantidadeEstoque: number;
  urlImagem: string | null;
};

export function UpsellProdutos() {
  const { extras, setExtraQtd } = useBooking();

  // mesma queryKey da Loja → cache compartilhado, carrega instantâneo
  const { data } = useQuery<Produto[]>({
    queryKey: ["produtos"],
    queryFn: async () => {
      const res = await fetch("/api/produtos");
      if (!res.ok) throw new Error("Erro ao carregar produtos");
      return res.json();
    },
  });

  const disponiveis = (data ?? []).filter((p) => p.quantidadeEstoque > 0);
  if (disponiveis.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">Leve na hora do corte</p>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Finalizadores e cuidados — retira direto na barbearia.
      </p>

      <div className="-mx-4 mt-3 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {disponiveis.map((p) => {
          const atual = extras.find((x) => x.id === p.id)?.qtd ?? 0;
          const base = { id: p.id, nome: p.nome, preco: Number(p.preco) };
          return (
            <div
              key={p.id}
              className={cn(
                "flex w-[148px] shrink-0 flex-col overflow-hidden rounded-xl border bg-card transition-colors",
                atual > 0 ? "border-primary" : "border-border"
              )}
            >
              <div className="relative aspect-[5/4] bg-muted">
                {p.urlImagem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.urlImagem}
                    alt={p.nome}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground/40">
                    <PackageIcon className="size-7" strokeWidth={1.5} aria-hidden="true" />
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-2.5">
                <p className="line-clamp-1 text-xs font-medium text-foreground">
                  {p.nome}
                </p>
                <p className="mt-0.5 flex items-baseline gap-1.5">
                  {p.precoAntigo && (
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground line-through">
                      {formatarPreco(p.precoAntigo)}
                    </span>
                  )}
                  <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                    {formatarPreco(p.preco)}
                  </span>
                </p>

                <div className="mt-2.5">
                  <AnimatePresence mode="wait" initial={false}>
                    {atual === 0 ? (
                      <motion.button
                        key="add"
                        type="button"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        onClick={() => setExtraQtd(base, 1)}
                        className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-border text-xs font-medium text-foreground transition-colors hover:bg-accent"
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                        Adicionar
                      </motion.button>
                    ) : (
                      <motion.div
                        key="stepper"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="flex h-8 items-center justify-between rounded-lg bg-primary px-1 text-primary-foreground"
                      >
                        <button
                          type="button"
                          aria-label="Remover um"
                          onClick={() => setExtraQtd(base, atual - 1)}
                          className="flex size-6 items-center justify-center rounded-md transition-colors hover:bg-primary-foreground/15"
                        >
                          <Minus className="size-3.5" aria-hidden="true" />
                        </button>
                        <span className="font-mono text-xs font-semibold tabular-nums">
                          {atual}
                        </span>
                        <button
                          type="button"
                          aria-label="Adicionar um"
                          disabled={atual >= p.quantidadeEstoque}
                          onClick={() => setExtraQtd(base, atual + 1)}
                          className="flex size-6 items-center justify-center rounded-md transition-colors hover:bg-primary-foreground/15 disabled:opacity-40"
                        >
                          <Plus className="size-3.5" aria-hidden="true" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
