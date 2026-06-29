"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarPlus, Images } from "lucide-react";
import { Lightbox } from "@/components/galeria/Lightbox";
import { formatarPreco } from "@/lib/utils/format";

type Imagem = { id: string; urlImagem: string; destaque: boolean };
type Categoria = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  precoMedio: string | null;
  servico: { id: string; slug: string | null; nome: string; preco: string } | null;
  imagens: Imagem[];
};

export default function GaleriaCategoriaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [aberta, setAberta] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery<Categoria>({
    queryKey: ["galeria", slug],
    queryFn: async () => {
      const res = await fetch(`/api/galeria/${slug}`);
      if (res.status === 404) throw new Error("404");
      if (!res.ok) throw new Error("Erro ao carregar");
      return res.json();
    },
    retry: false,
  });

  // Slug desconhecido/inativo → estado vazio amigável com volta pra galeria.
  if (isError) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 px-5 py-24 text-center md:px-8">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Images className="size-6" aria-hidden="true" />
        </span>
        <p className="font-medium text-foreground">Estilo não encontrado</p>
        <Link
          href="/galeria"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Voltar para a galeria
        </Link>
      </div>
    );
  }

  // Vincula o serviço ao carrinho. Usa slug quando existe, senão o id
  // (BookingStepper resolve os dois via ?servico=).
  const refServico = data?.servico?.slug || data?.servico?.id;
  const ctaHref = refServico ? `/?servico=${refServico}` : "/agendar";
  const ctaLabel = data?.servico?.nome
    ? `Agendar ${data.servico.nome}`
    : "Agendar serviço";

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 pb-28 md:px-8 md:py-10 md:pb-28">
      <Link
        href="/galeria"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Galeria
      </Link>

      {isLoading ? (
        <>
          <div className="mt-4 h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-6 columns-2 gap-2.5 sm:gap-3 lg:columns-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="mb-2.5 aspect-[3/4] animate-pulse rounded-2xl bg-muted sm:mb-3"
              />
            ))}
          </div>
        </>
      ) : data ? (
        <>
          <header className="mt-4">
            <h1 className="font-heading text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground">
              {data.nome}
            </h1>
            {data.descricao && (
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
                {data.descricao}
              </p>
            )}
            {data.precoMedio && (
              <p className="mt-2 font-mono text-sm tabular-nums text-foreground">
                a partir de{" "}
                <span className="font-bold">{formatarPreco(data.precoMedio)}</span>
              </p>
            )}
          </header>

          {data.imagens.length > 0 ? (
            <div className="mt-6 columns-2 gap-2.5 sm:gap-3 lg:columns-3">
              {data.imagens.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setAberta(i)}
                  className="mb-2.5 block w-full overflow-hidden rounded-2xl border border-border bg-muted sm:mb-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.urlImagem}
                    alt={`${data.nome} ${i + 1}`}
                    loading="lazy"
                    className="w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-12 rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
              Ainda sem fotos nesta categoria.
            </p>
          )}

          {/* CTA fixo */}
          <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-20 px-5 md:bottom-6 md:left-64 md:px-8">
            <Link
              href={ctaHref}
              className="mx-auto flex max-w-5xl items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform active:scale-[0.98]"
            >
              <CalendarPlus className="size-4" />
              {ctaLabel}
            </Link>
          </div>

          {aberta !== null && (
            <Lightbox
              imagens={data.imagens.map((i) => i.urlImagem)}
              inicial={aberta}
              onFechar={() => setAberta(null)}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
