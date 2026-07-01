"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  CheckCircle2,
  Clock,
  Package,
  ShoppingCart,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { AdminModal, Campo } from "@/components/admin/AdminModal";
import { Pill } from "@/components/admin/primitives";
import { formatarPreco, formatarData, formatarTelefone } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type ItemPedido = { nome: string; quantidade: number; preco: string };

type Pedido = {
  id: string;
  cliente: string;
  telefone: string;
  total: string;
  statusPagamento: "pendente" | "pago" | "falhou";
  formaPagamento: string | null;
  statusRetirada: "pendente" | "pronto" | "retirado";
  criadoEm: string;
  itens: ItemPedido[];
};

const PAGAMENTO_META: Record<Pedido["statusPagamento"], { rotulo: string; tom: "verde" | "amber" | "vermelho" }> = {
  pago: { rotulo: "Pago", tom: "verde" },
  pendente: { rotulo: "Pendente", tom: "amber" },
  falhou: { rotulo: "Falhou", tom: "vermelho" },
};

const RETIRADA_META: Record<Pedido["statusRetirada"], { rotulo: string; tom: "verde" | "amber" | "neutro" }> = {
  retirado: { rotulo: "Retirado", tom: "verde" },
  pronto: { rotulo: "Pronto", tom: "amber" },
  pendente: { rotulo: "Aguardando", tom: "neutro" },
};

const METODO_LABEL: Record<string, string> = {
  pix: "Pix",
  cartao: "Cartão",
  local: "Na barbearia",
};

const FILTROS = [
  { id: "todos", rotulo: "Todos" },
  { id: "pendente", rotulo: "Pagamento pendente" },
  { id: "pago", rotulo: "Pagos" },
] as const;

export function PedidosTab() {
  const [filtro, setFiltro] = useState<typeof FILTROS[number]["id"]>("todos");
  const [lista, setLista] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [alvo, setAlvo] = useState<Pedido | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const qs = filtro === "todos" ? "" : `?status=${filtro}`;
      const r = await fetch(`/api/admin/pedidos${qs}`);
      setLista(await r.json());
    } catch {
      toast.error("Erro ao carregar pedidos.");
    } finally {
      setCarregando(false);
    }
  }, [filtro]);

  useEffect(() => {
    const t = setTimeout(carregar, 0);
    return () => clearTimeout(t);
  }, [carregar]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              filtro === f.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      {carregando ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <ShoppingCart className="mx-auto size-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {lista.map((p) => {
            const pg = PAGAMENTO_META[p.statusPagamento];
            const rt = RETIRADA_META[p.statusRetirada];
            return (
              <motion.li
                key={p.id}
                layout
                className="rounded-2xl border border-border bg-card p-4 shadow-xs"
              >
                <button
                  onClick={() => setAlvo(p)}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">{p.cliente}</span>
                      <Pill tom={pg.tom}>{pg.rotulo}</Pill>
                      <Pill tom={rt.tom}>{rt.rotulo}</Pill>
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {formatarTelefone(p.telefone)} · {formatarData(p.criadoEm)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.itens.map((i) => `${i.quantidade}× ${i.nome}`).join(", ")}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-lg font-semibold tabular-nums text-foreground">
                    {formatarPreco(p.total)}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}

      {alvo && (
        <PedidoDetalheModal
          pedido={alvo}
          onFechar={() => setAlvo(null)}
          onMudou={() => {
            setAlvo(null);
            carregar();
          }}
        />
      )}
    </div>
  );
}

function PedidoDetalheModal({
  pedido,
  onFechar,
  onMudou,
}: {
  pedido: Pedido;
  onFechar: () => void;
  onMudou: () => void;
}) {
  const [metodo, setMetodo] = useState("dinheiro");
  const [acaoEmCurso, setAcaoEmCurso] = useState(false);
  const pg = PAGAMENTO_META[pedido.statusPagamento];
  const rt = RETIRADA_META[pedido.statusRetirada];
  const pago = pedido.statusPagamento === "pago";
  const retirado = pedido.statusRetirada === "retirado";

  async function acao(body: Record<string, unknown>, sucesso: string) {
    setAcaoEmCurso(true);
    try {
      const r = await fetch(`/api/admin/pedidos/${pedido.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error();
      toast.success(sucesso);
      onMudou();
    } catch {
      toast.error("Não foi possível concluir.");
    } finally {
      setAcaoEmCurso(false);
    }
  }

  return (
    <AdminModal aberto onFechar={onFechar} titulo="Detalhes do pedido" largura="max-w-md">
      <div className="space-y-4">
        {/* Resumo */}
        <div className="rounded-xl border border-border/60 bg-background p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xl font-semibold tabular-nums text-foreground">
              {formatarPreco(pedido.total)}
            </span>
            <div className="flex gap-1.5">
              <Pill tom={pg.tom}>{pg.rotulo}</Pill>
              <Pill tom={rt.tom}>{rt.rotulo}</Pill>
            </div>
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">{pedido.cliente}</p>
          <p className="text-xs text-muted-foreground">{formatarTelefone(pedido.telefone)}</p>
        </div>

        {/* Itens */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Itens</p>
          <ul className="space-y-1">
            {pedido.itens.map((item, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <Package className="size-3.5 shrink-0 text-muted-foreground" />
                  {item.quantidade}× {item.nome}
                </div>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {formatarPreco(Number(item.preco) * item.quantidade)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Dados */}
        <dl className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Criado em</dt>
            <dd className="text-foreground">{formatarData(pedido.criadoEm)}</dd>
          </div>
          {pedido.formaPagamento && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Forma de pagamento</dt>
              <dd className="text-foreground">{METODO_LABEL[pedido.formaPagamento] ?? pedido.formaPagamento}</dd>
            </div>
          )}
        </dl>

        {/* Ações */}
        <div className="space-y-2 border-t border-border pt-4">
          {!pago && (
            <>
              <Campo rotulo="Método recebido (pagamento manual)">
                <select
                  value={metodo}
                  onChange={(e) => setMetodo(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                >
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">Pix</option>
                  <option value="cartao_credito">Cartão de crédito</option>
                  <option value="cartao_debito">Cartão de débito</option>
                  <option value="outro">Outro</option>
                </select>
              </Campo>
              <button
                disabled={acaoEmCurso}
                onClick={() => acao({ acao: "marcar_pago", metodo }, "Pagamento confirmado.")}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/12 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20 disabled:opacity-60 dark:text-emerald-400"
              >
                {acaoEmCurso ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Marcar como pago
              </button>
            </>
          )}

          {pago && !retirado && (
            <div className="grid grid-cols-2 gap-2">
              {pedido.statusRetirada === "pendente" && (
                <button
                  disabled={acaoEmCurso}
                  onClick={() => acao({ acao: "marcar_pronto" }, "Pedido marcado como pronto.")}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-500/20 disabled:opacity-60 dark:text-amber-400"
                >
                  <Clock className="size-4" /> Marcar pronto
                </button>
              )}
              <button
                disabled={acaoEmCurso}
                onClick={() => acao({ acao: "marcar_retirado" }, "Retirada registrada.")}
                className="col-span-full inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary/10 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
              >
                <CheckCircle2 className="size-4" /> Marcar como retirado
              </button>
            </div>
          )}

          {pago && retirado && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/8 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              Pedido concluído — pago e retirado.
            </div>
          )}

          {!pago && pedido.statusPagamento === "falhou" && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/8 p-3 text-sm text-destructive">
              <XCircle className="size-4 shrink-0" />
              Pagamento falhou. Confirme manualmente acima.
            </div>
          )}
        </div>
      </div>
    </AdminModal>
  );
}
