"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Check, Package as PackageIcon, Layers, Hash } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { formatarPreco } from "@/lib/utils/format";

type PacoteServico = { servico: { id: string; nome: string } };
type PacoteProduto = { quantidade: number; produto: { id: string; nome: string } };

type Pacote = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: "quantidade" | "combo";
  preco: string;
  validadeDias: number | null;
  servicos: PacoteServico[];
  produtos: PacoteProduto[];
};

export default function PacotesPage() {
  const reduzir = useReducedMotion();
  const { data, isLoading, isError } = useQuery<Pacote[]>({
    queryKey: ["pacotes"],
    queryFn: async () => {
      const res = await fetch("/api/pacotes");
      if (!res.ok) throw new Error("Erro ao carregar pacotes");
      return res.json();
    },
  });

  const gridVariants: Variants = {
    show: { transition: { staggerChildren: reduzir ? 0 : 0.06 } },
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
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-muted" />
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
                whileHover={reduzir ? undefined : { y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="flex flex-col rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-primary">
                      <TipoIcone className="size-3.5" />
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
                    onClick={() =>
                      toast.info("Fale com a barbearia para ativar o pacote.")
                    }
                    className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
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
    </div>
  );
}

function EmptyPacotes() {
  return (
    <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <PackageIcon className="size-6" />
      </span>
      <p className="font-medium text-foreground">Nenhum pacote disponível ainda</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Em breve a barbearia vai montar combos de serviços e produtos para você.
      </p>
    </div>
  );
}
