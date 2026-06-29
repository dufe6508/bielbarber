"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Send,
  Ban,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { AdminModal, Campo } from "@/components/admin/AdminModal";
import { Pill } from "@/components/admin/primitives";
import { formatarPreco, formatarData, formatarTelefone } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export type Cobranca = {
  id: string;
  mensalistaId: string;
  nome: string;
  telefone: string;
  valor: string;
  status: "pendente" | "pago" | "vencido" | "cancelado" | "expirado";
  vencimento: string | null;
  descricao: string | null;
  metodo: string | null;
  emitidaManual: boolean;
  mpPaymentId: string | null;
  comprovanteUrl: string | null;
  pagoEm: string | null;
  criadoEm: string;
};

const STATUS_META: Record<
  Cobranca["status"],
  { rotulo: string; tom: "verde" | "amber" | "vermelho" | "neutro"; icone: typeof Clock }
> = {
  pendente: { rotulo: "Pendente", tom: "amber", icone: Clock },
  pago: { rotulo: "Pago", tom: "verde", icone: CheckCircle2 },
  vencido: { rotulo: "Vencido", tom: "vermelho", icone: AlertTriangle },
  cancelado: { rotulo: "Cancelado", tom: "neutro", icone: Ban },
  expirado: { rotulo: "Expirado", tom: "neutro", icone: XCircle },
};

const METODO_LABEL: Record<string, string> = {
  pix: "Pix",
  cartao_credito: "Crédito",
  cartao_debito: "Débito",
  dinheiro: "Dinheiro",
  outro: "Outro",
};

const FILTROS = [
  { id: "pendente", rotulo: "Pendentes" },
  { id: "vencido", rotulo: "Vencidos" },
  { id: "pago", rotulo: "Pagos" },
  { id: "todos", rotulo: "Todas" },
] as const;

export function CobrancasManager() {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["id"]>("pendente");
  const [lista, setLista] = useState<Cobranca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [alvo, setAlvo] = useState<Cobranca | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const qs = filtro === "todos" ? "" : `?status=${filtro}`;
      const r = await fetch(`/api/admin/cobrancas${qs}`);
      setLista(await r.json());
    } catch {
      toast.error("Erro ao carregar cobranças.");
    } finally {
      setCarregando(false);
    }
  }, [filtro]);

  useEffect(() => {
    const t = setTimeout(carregar, 0);
    return () => clearTimeout(t);
  }, [carregar]);

  return (
    <div>
      {/* Filtros por status */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhuma cobrança {filtro !== "todos" ? STATUS_META[filtro as Cobranca["status"]]?.rotulo.toLowerCase() : ""}.
        </p>
      ) : (
        <ul className="space-y-2">
          {lista.map((c) => {
            const meta = STATUS_META[c.status];
            const Icone = meta.icone;
            return (
              <motion.li
                key={c.id}
                layout
                className="rounded-2xl border border-border bg-card p-4 shadow-xs"
              >
                <button
                  onClick={() => setAlvo(c)}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {c.nome}
                      </span>
                      <Pill tom={meta.tom}>
                        <Icone className="size-3" /> {meta.rotulo}
                      </Pill>
                      {c.emitidaManual && <Pill tom="neutro">manual</Pill>}
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {c.pagoEm
                        ? `Pago ${formatarData(c.pagoEm)}${c.metodo ? ` · ${METODO_LABEL[c.metodo] ?? c.metodo}` : ""}`
                        : c.vencimento
                          ? `Vence ${formatarData(c.vencimento)}`
                          : formatarData(c.criadoEm)}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-lg font-semibold tabular-nums text-foreground">
                    {formatarPreco(c.valor)}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}

      {alvo && (
        <CobrancaDetalheModal
          cobranca={alvo}
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

function CobrancaDetalheModal({
  cobranca,
  onFechar,
  onMudou,
}: {
  cobranca: Cobranca;
  onFechar: () => void;
  onMudou: () => void;
}) {
  const [metodo, setMetodo] = useState("dinheiro");
  const [acaoEmCurso, setAcaoEmCurso] = useState(false);
  const meta = STATUS_META[cobranca.status];
  const aberta = cobranca.status === "pendente" || cobranca.status === "vencido";

  async function acao(body: Record<string, unknown>, sucesso: string) {
    setAcaoEmCurso(true);
    try {
      const r = await fetch(`/api/admin/cobrancas/${cobranca.id}`, {
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
    <AdminModal aberto onFechar={onFechar} titulo="Detalhes da cobrança" largura="max-w-md">
      <div className="space-y-4">
        {/* Resumo */}
        <div className="rounded-xl border border-border/60 bg-background p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xl font-semibold tabular-nums text-foreground">
              {formatarPreco(cobranca.valor)}
            </span>
            <Pill tom={meta.tom}>
              <meta.icone className="size-3" /> {meta.rotulo}
            </Pill>
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">{cobranca.nome}</p>
          <p className="text-xs text-muted-foreground">{formatarTelefone(cobranca.telefone)}</p>
          {cobranca.descricao && (
            <p className="mt-1 text-xs text-muted-foreground">{cobranca.descricao}</p>
          )}
        </div>

        {/* Dados da transação */}
        <dl className="space-y-1.5 text-sm">
          {cobranca.vencimento && (
            <Linha rotulo="Vencimento" valor={formatarData(cobranca.vencimento)} />
          )}
          {cobranca.pagoEm && <Linha rotulo="Pago em" valor={formatarData(cobranca.pagoEm)} />}
          {cobranca.metodo && (
            <Linha rotulo="Método" valor={METODO_LABEL[cobranca.metodo] ?? cobranca.metodo} />
          )}
          {cobranca.mpPaymentId && (
            <Linha rotulo="ID Mercado Pago" valor={cobranca.mpPaymentId} mono />
          )}
          <Linha rotulo="Origem" valor={cobranca.emitidaManual ? "Manual" : "Automática"} />
        </dl>

        {cobranca.comprovanteUrl && (
          <a
            href={cobranca.comprovanteUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ExternalLink className="size-3.5" /> Ver comprovante
          </a>
        )}

        {/* Ações */}
        {aberta && (
          <div className="space-y-3 border-t border-border pt-4">
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
            <div className="grid grid-cols-1 gap-2">
              <button
                disabled={acaoEmCurso}
                onClick={() => acao({ acao: "marcar_pago", metodo }, "Pagamento confirmado.")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500/12 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20 disabled:opacity-60 dark:text-emerald-400"
              >
                <CheckCircle2 className="size-4" /> Marcar como pago
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={acaoEmCurso}
                  onClick={() => acao({ acao: "reenviar" }, "Aviso reenviado.")}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-muted/60 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                >
                  <Send className="size-4" /> Reenviar
                </button>
                <button
                  disabled={acaoEmCurso}
                  onClick={() => acao({ acao: "cancelar" }, "Cobrança cancelada.")}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
                >
                  <Ban className="size-4" /> Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminModal>
  );
}

function Linha({ rotulo, valor, mono }: { rotulo: string; valor: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className={cn("truncate text-foreground", mono && "font-mono text-xs")}>{valor}</dd>
    </div>
  );
}
