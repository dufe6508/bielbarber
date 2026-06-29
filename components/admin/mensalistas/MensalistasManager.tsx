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
} from "lucide-react";
import { toast } from "sonner";
import { AdminModal, Campo, inputCls } from "@/components/admin/AdminModal";
import { Pill } from "@/components/admin/primitives";
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
  const [lista, setLista] = useState<Mensalista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [diaCobranca, setDiaCobranca] = useState<10 | 30>(10);
  const [salvando, setSalvando] = useState(false);

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

  async function marcarPago(m: Mensalista) {
    if (!confirm(`Confirmar pagamento de ${formatarPreco(m.totalCiclo)} de ${m.nome}?`))
      return;
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

  async function desativar(m: Mensalista) {
    if (!confirm(`Remover ${m.nome} dos mensalistas?`)) return;
    await fetch(`/api/admin/mensalistas/${m.id}`, { method: "DELETE" });
    carregar();
  }

  const ativos = lista.filter((m) => m.status === "ativo");

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex gap-2">
          <Pill tom="verde">Dia 10: {ativos.filter((m) => m.diaCobranca === 10).length}</Pill>
          <Pill tom="azul">Dia 30: {ativos.filter((m) => m.diaCobranca === 30).length}</Pill>
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
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-base font-semibold text-foreground">
                      {m.nome}
                    </h3>
                    <Pill tom={e.tom}>
                      <Icone className="size-3" /> {e.rotulo}
                    </Pill>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="size-3" /> {formatarTelefone(m.telefone)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="size-3" /> Fecha dia {m.diaCobranca}
                    </span>
                    {m.proximaCobranca && (
                      <span>Próx.: {formatarData(m.proximaCobranca)}</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
                    {formatarPreco(m.totalCiclo)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {m.atendimentosCiclo} no ciclo
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => marcarPago(m)}
                    disabled={m.totalCiclo === 0}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                      m.totalCiclo === 0
                        ? "cursor-not-allowed text-muted-foreground/50"
                        : "bg-emerald-500/12 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                    )}
                  >
                    <CheckCircle2 className="size-3.5" /> Pago
                  </button>
                  <button
                    onClick={() => desativar(m)}
                    className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                    aria-label="Remover"
                  >
                    <UserMinus className="size-3.5" />
                  </button>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}

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
    </div>
  );
}
