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
  slotsNecessarios?: number;
};

const SPRING = { type: "spring", stiffness: 360, damping: 26 } as const;

// Serviços que exigem 2 horários seguidos (coloração leva ~2h).
// Provisório: derivado da categoria. Depois vira flag por serviço no admin/banco.
const SECAO_DOIS_SLOTS = "Coloração";

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

// Nomes dos serviços que exigem 2 slots (seção Coloração)
const NOMES_DOIS_SLOTS = new Set(
  CATEGORIAS.find((c) => c.titulo === SECAO_DOIS_SLOTS)?.nomes ?? []
);

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
            Selecione um ou mais serviços.
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
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3.5 px-4 py-3.5">
              <div className="size-5 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
                <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-3.5 w-12 animate-pulse rounded bg-muted" />
            </div>
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
          {/* Abas nomeadas — controle segmentado, ancora a navegação das seções */}
          {totalPaginas > 1 && (
            <div className="-mx-1 mb-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="inline-flex gap-1 rounded-full border border-border bg-muted p-1">
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
                        "relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                        ativo
                          ? "text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {ativo && (
                        <motion.span
                          layoutId="aba-ativa"
                          transition={SPRING}
                          className="absolute inset-0 rounded-full bg-primary shadow-sm"
                        />
                      )}
                      <span className="relative">{p.titulo}</span>
                      {sel > 0 && (
                        <span
                          className={cn(
                            "relative flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                            ativo
                              ? "bg-primary-foreground/20 text-primary-foreground"
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
            </div>
          )}

          {/* Lista conectada — arrastável na horizontal */}
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
                className="touch-pan-y divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm"
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
                            slotsNecessarios:
                              s.slotsNecessarios ??
                              (NOMES_DOIS_SLOTS.has(s.nome) ? 2 : 1),
                          })
                        }
                        aria-pressed={selecionado}
                        className={cn(
                          "group relative flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors duration-200",
                          selecionado ? "bg-accent" : "hover:bg-muted/60"
                        )}
                      >
                        {/* Barra de acento — ancora visualmente a linha selecionada */}
                        <AnimatePresence>
                          {selecionado && (
                            <motion.span
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: 1 }}
                              exit={{ scaleY: 0 }}
                              transition={SPRING}
                              className="absolute inset-y-0 left-0 w-1 origin-center bg-primary"
                              aria-hidden="true"
                            />
                          )}
                        </AnimatePresence>

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

          {/* Indicador de páginas + dica de arraste */}
          {totalPaginas > 1 && (
            <div className="mt-3 flex items-center justify-center gap-2">
              {paginas.map((p, i) => (
                <button
                  key={p.titulo}
                  type="button"
                  onClick={() => irPagina(i)}
                  aria-label={`Ir para ${p.titulo}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === paginaAtual
                      ? "w-5 bg-primary"
                      : "w-1.5 bg-border hover:bg-muted-foreground/40"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
