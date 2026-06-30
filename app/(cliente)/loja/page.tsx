"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
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
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { PagamentoDrawer } from "@/components/PagamentoDrawer";
import { Input } from "@/components/ui/input";
import {
  formatarPreco,
  formatarTelefone,
  telefoneNumeros,
} from "@/lib/utils/format";
import { lembrarTelefone, telefoneLembrado, lembrarNome, nomeLembrado } from "@/lib/utils/telefone";

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

type RespostaPedido = { pedidoId: string; chargeId: string; valor: number };

export default function LojaPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [voos, setVoos] = useState<Voo[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [pagamentoAberto, setPagamentoAberto] = useState(false);
  const [pedidoData, setPedidoData] = useState<RespostaPedido | null>(null);
  const [nome, setNome] = useState(() =>
    typeof window !== "undefined" ? nomeLembrado() : ""
  );
  const [telefone, setTelefone] = useState(() => {
    const t = typeof window !== "undefined" ? telefoneLembrado() : null;
    return t ? formatarTelefone(t) : "";
  });
  const carrinhoRef = useRef<HTMLSpanElement>(null);
  const vooSeq = useRef(0);
  const reduzir = useReducedMotion();

  // Lida com redirect do Mercado Pago (back_urls)
  useEffect(() => {
    const pago = searchParams.get("pago");
    const pendente = searchParams.get("pendente");
    const falhou = searchParams.get("falhou");
    if (pago) {
      toast.success("Pedido confirmado!", { description: "Retire seus produtos na barbearia." });
      router.replace("/loja");
    } else if (pendente) {
      toast.info("Pagamento em análise.", { description: "Seu pedido será confirmado em breve." });
      router.replace("/loja");
    } else if (falhou) {
      toast.error("Pagamento não aprovado.", { description: "Tente novamente ou use outro método." });
      router.replace("/loja");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const criarPedido = useMutation<RespostaPedido, Error, void>({
    mutationFn: async () => {
      if (!data) throw new Error("Produtos não carregados");
      const itens = Object.entries(carrinho)
        .filter(([, qtd]) => qtd > 0)
        .map(([produtoId, quantidade]) => ({ produtoId, quantidade }));

      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, telefone, itens }),
      });
      const dados = await res.json().catch(() => null);
      if (!res.ok || !dados) {
        throw new Error(dados?.error ?? "Não foi possível criar o pedido. Tente novamente.");
      }
      return dados;
    },
    onSuccess: (dados) => {
      lembrarTelefone(telefoneNumeros(telefone));
      lembrarNome(nome);
      setPedidoData(dados);
      setModalAberto(false);
      setPagamentoAberto(true);
    },
    onError: (e) => {
      toast.error(e.message);
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

  const podeContinuar =
    nome.trim().length >= 2 && telefoneNumeros(telefone).length >= 10;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 pb-28 md:px-8 md:py-12 md:pb-12">
      <PageHeader
        titulo="Loja"
        descricao="Escolha seus produtos e pague online (Pix ou cartão). Retire na hora do corte."
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

                  {/* Badges */}
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

                  {/* Add / Stepper */}
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

                {/* Conteúdo */}
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

      {/* Barra de checkout (carrinho) */}
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
                onClick={() => setModalAberto(true)}
                className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
              >
                Finalizar
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

      {/* Modal de identificação (nome + telefone) */}
      <AnimatePresence>
        {modalAberto && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setModalAberto(false)}
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
                onClick={() => setModalAberto(false)}
                className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="size-4.5" />
              </button>

              <div className="space-y-4">
                <div>
                  <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
                    Finalizar pedido
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {totalItens} {totalItens === 1 ? "item" : "itens"} ·{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {formatarPreco(totalPreco)}
                    </span>
                  </p>
                </div>

                {/* Resumo */}
                <div className="rounded-xl border border-border bg-background/50 p-3 text-sm">
                  {(data ?? [])
                    .filter((p) => (carrinho[p.id] ?? 0) > 0)
                    .map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 py-0.5">
                        <span className="text-foreground">
                          {carrinho[p.id]}× {p.nome}
                        </span>
                        <span className="font-mono tabular-nums text-muted-foreground">
                          {formatarPreco(Number(p.preco) * (carrinho[p.id] ?? 0))}
                        </span>
                      </div>
                    ))}
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

                {criarPedido.isError && (
                  <p className="text-sm text-destructive">{criarPedido.error.message}</p>
                )}

                <button
                  onClick={() => criarPedido.mutate()}
                  disabled={!podeContinuar || criarPedido.isPending}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40"
                >
                  {criarPedido.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Ir para o pagamento"
                  )}
                </button>
                <p className="text-center text-[11px] text-muted-foreground">
                  Pagamento online seguro via Mercado Pago. Retire na barbearia.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawer de pagamento */}
      {pedidoData && (
        <PagamentoDrawer
          open={pagamentoAberto}
          onOpenChange={setPagamentoAberto}
          total={pedidoData.valor}
          chargeId={pedidoData.chargeId}
          descricao={`Pedido Loja · ${totalItens} ${totalItens === 1 ? "item" : "itens"}`}
          legenda="Pedido · Biel Barber"
          textoPixRodape="Assim que o pagamento cair, seu pedido é confirmado automaticamente."
          tituloSucesso="Pedido confirmado!"
          textoSucesso="Retire seus produtos na hora do corte."
          onPago={() => {
            setCarrinho({});
            setPedidoData(null);
          }}
        />
      )}
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
