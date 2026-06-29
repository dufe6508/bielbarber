"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { Images, Star } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { formatarPreco } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Categoria = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  precoMedio: string | null;
  imagemCapa: string | null;
  destaque: boolean;
  _count: { imagens: number };
};

export default function GaleriaPage() {
  const [filtro, setFiltro] = useState<string | null>(null);
  const reduzir = useReducedMotion();

  const { data, isLoading, isError } = useQuery<Categoria[]>({
    queryKey: ["galeria"],
    queryFn: async () => {
      const res = await fetch("/api/galeria");
      if (!res.ok) throw new Error("Erro ao carregar galeria");
      return res.json();
    },
  });

  const gridVariants: Variants = {
    show: { transition: { staggerChildren: reduzir ? 0 : 0.035 } },
  };
  const cardVariants: Variants = reduzir
    ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] } },
      };

  const visiveis = filtro ? data?.filter((c) => c.slug === filtro) : data;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 pb-28 md:px-8 md:py-12 md:pb-12">
      <PageHeader
        titulo="Galeria"
        descricao="Inspire-se nos estilos. Escolha um e agende direto pela foto."
      />

      {isError && (
        <p className="mt-8 rounded-xl bg-destructive/10 p-4 text-center text-sm text-destructive">
          Não foi possível carregar a galeria. Recarregue a página.
        </p>
      )}

      {/* Filtro horizontal por categoria */}
      {data && data.length > 0 && (
        <div className="mt-6 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
          <Chip ativo={filtro === null} onClick={() => setFiltro(null)}>
            Todos
          </Chip>
          {data.map((c) => (
            <Chip key={c.id} ativo={filtro === c.slug} onClick={() => setFiltro(c.slug)}>
              {c.nome}
            </Chip>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="aspect-[3/4] animate-pulse bg-muted" />
              <div className="space-y-1.5 p-2.5">
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : visiveis && visiveis.length > 0 ? (
        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate="show"
          className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
        >
          {visiveis.map((c) => (
            <motion.div key={c.id} variants={cardVariants}>
              <Link
                href={`/galeria/${c.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md hover:shadow-primary/5"
              >
                <div className="relative aspect-[3/4] bg-muted">
                  {c.imagemCapa ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.imagemCapa}
                      alt={c.nome}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground/40">
                      <Images className="size-9" strokeWidth={1.5} aria-hidden="true" />
                    </div>
                  )}
                  {c.destaque && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm">
                      <Star className="size-2.5" /> Destaque
                    </span>
                  )}
                  <span className="absolute bottom-2 right-2 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-sm backdrop-blur">
                    {c._count.imagens} {c._count.imagens === 1 ? "foto" : "fotos"}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-2.5">
                  <h2 className="truncate font-heading text-[13px] font-semibold leading-tight tracking-tight text-foreground">
                    {c.nome}
                  </h2>
                  {c.precoMedio && (
                    <span className="mt-1 font-mono text-sm font-bold tabular-nums text-foreground">
                      {formatarPreco(c.precoMedio)}
                    </span>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <EmptyGaleria />
      )}
    </div>
  );
}

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        ativo
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function EmptyGaleria() {
  return (
    <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Images className="size-6" aria-hidden="true" />
      </span>
      <p className="font-medium text-foreground">Galeria em construção</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Em breve o barbeiro vai publicar os cortes do portfólio aqui.
      </p>
    </div>
  );
}
