"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import { Check } from "lucide-react";
import { useBooking } from "@/lib/store/booking";
import { formatarPreco } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Servico = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: string;
};

const SPRING = { type: "spring", stiffness: 360, damping: 26 } as const;

// Seções (páginas). Ordem dos nomes = ordem de exibição dentro da seção.
const CATEGORIAS: { titulo: string; nomes: string[] }[] = [
  {
    titulo: "Principais",
    nomes: [
      "Corte Disfarçado (Fade)",
      "Corte Social",
      "Corte Só Tesoura",
      "Barba",
    ],
  },
  {
    titulo: "Complementares",
    nomes: [
      "Cavanhaque (Simples)",
      "Barba c/ Tinta",
      "Sobrancelha",
      "Pezinho",
      "Desenho / Freestyle",
    ],
  },
  {
    titulo: "Coloração",
    nomes: [
      "Tinta Preta",
      "Tinta Colorida",
      "Alisante",
      "Luzes (Simples)",
      "Reflexo Alinhado",
      "Reflexo Arrepiado",
      "Platinado",
    ],
  },
];

export function StepServicos() {
  const { servicos, toggleServico } = useBooking();
  const reduzir = useReducedMotion();
  const [pagina, setPagina] = useState(0);
  const [dir, setDir] = useState(0);

  const { data, isLoading, isError } = useQuery<Servico[]>({
    queryKey: ["servicos"],
    queryFn: async () => {
      const res = await fetch("/api/servicos");
      if (!res.ok) throw new Error("Erro ao carregar serviços");
      return res.json();
    },
  });

  // Páginas a partir das categorias (ordem preservada). Sobras → "Outros".
  const paginas = useMemo(() => {
    if (!data) return [];
    const porNome = new Map(data.map((s) => [s.nome, s]));
    const usados = new Set<string>();
    const grupos = CATEGORIAS.map((c) => {
      const itens = c.nomes
        .map((n) => porNome.get(n))
        .filter((s): s is Servico => !!s);
      itens.forEach((s) => usados.add(s.id));
      return { titulo: c.titulo, itens };
    }).filter((g) => g.itens.length > 0);

    const sobra = data.filter((s) => !usados.has(s.id));
    if (sobra.length) grupos.push({ titulo: "Outros", itens: sobra });
    return grupos;
  }, [data]);

  const totalPaginas = paginas.length;
  const paginaAtual = Math.min(pagina, Math.max(0, totalPaginas - 1));
  const grupo = paginas[paginaAtual];
  const totalSelecionado = servicos.length;

  function irPagina(novo: number) {
    const alvo = Math.max(0, Math.min(totalPaginas - 1, novo));
    setDir(alvo > paginaAtual ? 1 : -1);
    setPagina(alvo);
  }

  function aoArrastar(_: unknown, info: PanInfo) {
    const limite = 56;
    if (info.offset.x < -limite) irPagina(paginaAtual + 1);
    else if (info.offset.x > limite) irPagina(paginaAtual - 1);
  }

  // quantos selecionados por seção (badge nas abas)
  function selecionadosNaPagina(itens: Servico[]) {
    return itens.filter((it) => servicos.some((x) => x.id === it.id)).length;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Escolha os serviços
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione um ou mais — arraste pro lado entre as seções.
          </p>
        </div>

        <AnimatePresence>
          {totalSelecionado > 0 && (
            <motion.span
              key="contador"
              initial={{ opacity: 0, scale: 0.65, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.65, y: 6 }}
              transition={SPRING}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm"
            >
              <motion.span
                key={totalSelecionado}
                initial={{ scale: reduzir ? 1 : 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={SPRING}
                className="tabular-nums"
              >
                {totalSelecionado}
              </motion.span>
              {totalSelecionado === 1 ? "selecionado" : "selecionados"}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {isError && (
        <p className="rounded-xl bg-destructive/10 p-4 text-center text-sm text-destructive">
          Não foi possível carregar os serviços. Recarregue a página.
        </p>
      )}

      {grupo && (
        <div>
          {/* Abas nomeadas — mostram onde está cada tipo de serviço */}
          {totalPaginas > 1 && (
            <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {paginas.map((p, i) => {
                const ativo = i === paginaAtual;
                const sel = selecionadosNaPagina(p.itens);
                return (
                  <button
                    key={p.titulo}
                    type="button"
                    onClick={() => irPagina(i)}
                    aria-current={ativo}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      ativo
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {p.titulo}
                    {sel > 0 && (
                      <span
                        className={cn(
                          "flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                          ativo
                            ? "bg-primary-foreground/20"
                            : "bg-primary text-primary-foreground"
                        )}
                      >
                        {sel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Lista compacta — arrastável na horizontal */}
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.ul
                key={grupo.titulo}
                custom={dir}
                drag={totalPaginas > 1 ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.16}
                onDragEnd={aoArrastar}
                initial={
                  reduzir ? { opacity: 0 } : { opacity: 0, x: dir >= 0 ? 32 : -32 }
                }
                animate={{ opacity: 1, x: 0 }}
                exit={
                  reduzir ? { opacity: 0 } : { opacity: 0, x: dir >= 0 ? -32 : 32 }
                }
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="touch-pan-y space-y-2"
              >
                {grupo.itens.map((s) => {
                  const selecionado = servicos.some((x) => x.id === s.id);
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() =>
                          toggleServico({
                            id: s.id,
                            nome: s.nome,
                            preco: Number(s.preco),
                          })
                        }
                        aria-pressed={selecionado}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-[border-color,background-color] duration-200",
                          selecionado
                            ? "border-primary bg-accent"
                            : "border-border bg-card hover:border-primary/35"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-[border-color,background-color] duration-200",
                            selecionado
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/35 group-hover:border-primary/50"
                          )}
                        >
                          <AnimatePresence>
                            {selecionado && (
                              <motion.span
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={SPRING}
                              >
                                <Check
                                  className="size-3 text-primary-foreground"
                                  strokeWidth={3.5}
                                  aria-hidden="true"
                                />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium leading-snug text-foreground">
                            {s.nome}
                          </span>
                          {s.descricao && (
                            <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">
                              {s.descricao}
                            </span>
                          )}
                        </span>

                        <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-foreground">
                          {formatarPreco(s.preco)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </motion.ul>
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
