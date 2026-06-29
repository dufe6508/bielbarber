"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Loader2,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Phone,
  CalendarClock,
  UserMinus,
  Scissors,
  FileText,
  Users,
  Receipt,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AdminModal, ConfirmDialog, Campo, inputCls } from "@/components/admin/AdminModal";
import { Pill } from "@/components/admin/primitives";
import { CobrancasManager } from "@/components/admin/mensalistas/CobrancasManager";
import { formatarPreco, formatarData, formatarTelefone } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Mensalista = {
  id: string;
  nome: string;
  telefone: string;
  diaCobranca: number;
  status: "ativo" | "inativo";
  totalCiclo: number;
  atendimentosCiclo: number;
  proximaCobranca: string | null;
  dataUltimoPagamento: string | null;
  valorUltimoPagamento: string | null;
  estado: "pago" | "pendente" | "vencido";
};

const ESTADO: Record<
  Mensalista["estado"],
  { rotulo: string; tom: "verde" | "amber" | "vermelho"; icone: typeof Clock }
> = {
  pago: { rotulo: "Em dia", tom: "verde", icone: CheckCircle2 },
  pendente: { rotulo: "Pendente", tom: "amber", icone: Clock },
  vencido: { rotulo: "Vencido", tom: "vermelho", icone: AlertTriangle },
};

export function MensalistasManager() {
  const [aba, setAba] = useState<"mensalistas" | "cobrancas">("mensalistas");
  const [lista, setLista] = useState<Mensalista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [diaCobranca, setDiaCobranca] = useState<10 | 30>(10);
  const [salvando, setSalvando] = useState(false);
  const [emitindo, setEmitindo] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<{
    titulo: string;
    mensagem?: string;
    perigo?: boolean;
    rotuloConfirmar?: string;
    onConfirmar: () => void;
  } | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const r = await fetch("/api/admin/mensalistas");
      setLista(await r.json());
    } catch {
      toast.error("Erro ao carregar.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(carregar, 0);
    return () => clearTimeout(t);
  }, []);

  async function adicionar() {
    if (telefone.replace(/\D/g, "").length < 10) {
      toast.error("Telefone inválido.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/admin/mensalistas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone, nome, diaCobranca }),
      });
      if (!res.ok) throw new Error();
      toast.success("Mensalista cadastrado.");
      setModal(false);
      setTelefone("");
      setNome("");
      carregar();
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function _marcarPago(m: Mensalista) {
    const res = await fetch(`/api/admin/mensalistas/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "marcar_pago" }),
    });
    if (res.ok) {
      toast.success("Ciclo fechado e reiniciado.");
      carregar();
    } else toast.error("Erro.");
  }

  function marcarPago(m: Mensalista) {
    setConfirmacao({
      titulo: "Quitar ciclo",
      mensagem: `Confirmar pagamento de ${formatarPreco(m.totalCiclo)} de ${m.nome}?`,
      rotuloConfirmar: "Quitar",
      onConfirmar: () => { setConfirmacao(null); _marcarPago(m); },
    });
  }

  function desativar(m: Mensalista) {
    setConfirmacao({
      titulo: "Remover mensalista",
      mensagem: `Remover ${m.nome} dos mensalistas? Esta ação não pode ser desfeita.`,
      perigo: true,
      rotuloConfirmar: "Remover",
      onConfirmar: async () => {
        setConfirmacao(null);
        await fetch(`/api/admin/mensalistas/${m.id}`, { method: "DELETE" });
        carregar();
      },
    });
  }

  // Emite uma cobrança manual imediata para o mensalista.
  async function emitirCobranca(m: Mensalista) {
    setEmitindo(m.id);
    try {
      const res = await fetch(`/api/admin/mensalistas/${m.id}/cobrancas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const dados = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(dados?.error ?? "Não foi possível emitir.");
        return;
      }
      toast.success("Cobrança emitida e enviada ao cliente.");
      setAba("cobrancas");
    } catch {
      toast.error("Erro ao emitir cobrança.");
    } finally {
      setEmitindo(null);
    }
  }

  const ativos = lista.filter((m) => m.status === "ativo");

  return (
    <div>
      {/* Segmented control: Mensalistas / Cobranças */}
      <div className="mb-5 inline-flex rounded-full border border-border bg-card p-1">
        {(
          [
            { id: "mensalistas" as const, rotulo: "Mensalistas", icone: Users },
            { id: "cobrancas" as const, rotulo: "Cobranças", icone: Receipt },
          ]
        ).map((t) => {
          const on = aba === t.id;
          const Icone = t.icone;
          return (
            <button
              key={t.id}
              onClick={() => setAba(t.id)}
              className={cn(
                "relative inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                on ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {on && (
                <motion.span
                  layoutId="mensalistas-aba"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                />
              )}
              <Icone className="relative size-3.5" />
              <span className="relative">{t.rotulo}</span>
            </button>
          );
        })}
      </div>

      {aba === "cobrancas" ? (
        <CobrancasManager />
      ) : (
      <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <GrupoChip dia={10} qtd={ativos.filter((m) => m.diaCobranca === 10).length} />
          <GrupoChip dia={30} qtd={ativos.filter((m) => m.diaCobranca === 30).length} />
        </div>
        <button
          onClick={() => setModal(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95"
        >
          <Plus className="size-4" />
          Novo mensalista
        </button>
      </div>

      {carregando ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : ativos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhum mensalista ativo.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {ativos.map((m) => {
            const e = ESTADO[m.estado];
            const Icone = e.icone;
            return (
              <motion.li
                key={m.id}
                layout
                className="rounded-xl border border-border bg-card px-3.5 py-3 shadow-xs"
              >
                {/* Topo: nome + status + remover */}
                <div className="flex items-center justify-between gap-2">
                  <h3 className="min-w-0 truncate font-heading text-sm font-semibold text-foreground">
                    {m.nome}
                  </h3>
                  <div className="flex shrink-0 items-center gap-1">
                    <Pill tom={e.tom}>
                      <Icone className="size-3" /> {e.rotulo}
                    </Pill>
                    <button
                      onClick={() => desativar(m)}
                      className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground/60 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                      aria-label="Remover"
                    >
                      <UserMinus className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metadados */}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3 shrink-0" /> {formatarTelefone(m.telefone)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="size-3 shrink-0" /> Fecha dia {m.diaCobranca}
                  </span>
                  {m.proximaCobranca && (
                    <span className="text-muted-foreground/70">Próx. {formatarData(m.proximaCobranca)}</span>
                  )}
                </div>

                {/* Valor + ações */}
                <div className="mt-2.5 flex items-center gap-2 border-t border-border/50 pt-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-base font-semibold tabular-nums leading-none text-foreground">
                      {formatarPreco(m.totalCiclo)}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Scissors className="size-2.5 shrink-0" />
                      {m.atendimentosCiclo} {m.atendimentosCiclo === 1 ? "corte" : "cortes"} no ciclo
                    </p>
                  </div>

                  {/* Emitir cobrança */}
                  <button
                    onClick={() => emitirCobranca(m)}
                    disabled={emitindo === m.id}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 text-xs font-medium text-foreground transition-all hover:bg-muted active:scale-95 disabled:opacity-50"
                  >
                    {emitindo === m.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <FileText className="size-3" />
                    )}
                    Cobrança
                  </button>

                  {/* Quitar ciclo */}
                  <button
                    onClick={() => marcarPago(m)}
                    disabled={m.totalCiclo === 0}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all active:scale-95",
                      m.totalCiclo === 0
                        ? "cursor-not-allowed bg-muted/30 text-muted-foreground/40"
                        : "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                    )}
                  >
                    <BadgeCheck className="size-3.5 shrink-0" />
                    Quitar
                  </button>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        aberto={!!confirmacao}
        titulo={confirmacao?.titulo ?? ""}
        mensagem={confirmacao?.mensagem}
        perigo={confirmacao?.perigo}
        rotuloConfirmar={confirmacao?.rotuloConfirmar}
        onCancelar={() => setConfirmacao(null)}
        onConfirmar={() => confirmacao?.onConfirmar()}
      />

      <AdminModal
        aberto={modal}
        onFechar={() => setModal(false)}
        titulo="Novo mensalista"
        largura="max-w-md"
      >
        <div className="space-y-4">
          <Campo rotulo="Telefone">
            <input
              className={inputCls}
              value={telefone}
              onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
              placeholder="(31) 99999-9999"
              inputMode="numeric"
            />
          </Campo>
          <Campo rotulo="Nome (opcional se já cadastrado)">
            <input
              className={inputCls}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </Campo>
          <Campo rotulo="Grupo de fechamento">
            <div className="flex gap-2">
              {([10, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDiaCobranca(d)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                    diaCobranca === d
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  Dia {d}
                </button>
              ))}
            </div>
          </Campo>
          <button
            onClick={adicionar}
            disabled={salvando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {salvando && <Loader2 className="size-4 animate-spin" />}
            Cadastrar
          </button>
        </div>
      </AdminModal>
      </>
      )}
    </div>
  );
}

// Chip neutro de grupo de fechamento — harmonizado com a paleta onyx.
function GrupoChip({ dia, qtd }: { dia: number; qtd: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-xs">
      <CalendarClock className="size-3.5 shrink-0" />
      Dia {dia}
      <span className="font-mono font-semibold tabular-nums text-foreground">{qtd}</span>
    </span>
  );
}
