"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Ban,
  CalendarClock,
  Crown,
  Loader2,
  ImageIcon,
  Pencil,
  ShieldCheck,
  Star,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { AdminModal, inputCls } from "@/components/admin/AdminModal";
import { CollapsibleCard } from "@/components/admin/CollapsibleCard";
import { Pill } from "@/components/admin/primitives";
import { formatarPreco, formatarTelefone } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type StatusAg = "agendado" | "concluido" | "cancelado" | "nao_compareceu";

type Agendamento = {
  id: string;
  data: string;
  horarioInicio: string;
  status: StatusAg;
  statusPagamento: "pendente" | "pago" | "falhou";
  valorTotal: number;
  servicos: string[];
};

type Perfil = {
  id: string;
  nome: string;
  telefone: string;
  bloqueado: boolean;
  motivoBloqueio: string | null;
  vip: boolean;
  observacoes: string | null;
  podePagarLocal: boolean;
  criadoEm: string;
  mensalidade: { status: string; diaCobranca: number; totalCicloAtual: number } | null;
  assinaturas: { nome: string; usosRestantes: number | null; expiraEm: string | null }[];
  stats: {
    totalCortes: number;
    totalGasto: number;
    ticketMedio: number;
    ultimoCorte: string | null;
    diasSemVoltar: number | null;
    freqMediaDias: number | null;
  };
  agendamentos: Agendamento[];
};

// Mudanças que o pai aplica na linha da lista sem refetch total.
export type PatchCliente = {
  bloqueado?: boolean;
  motivoBloqueio?: string | null;
  vip?: boolean;
};

const STATUS_LABEL: Record<StatusAg, string> = {
  agendado: "Ativo",
  concluido: "Concluído",
  cancelado: "Cancelado",
  nao_compareceu: "Faltou",
};

const FILTROS: { chave: "todos" | StatusAg; rotulo: string }[] = [
  { chave: "todos", rotulo: "Todos" },
  { chave: "agendado", rotulo: "Ativos" },
  { chave: "concluido", rotulo: "Concluídos" },
  { chave: "cancelado", rotulo: "Cancelados" },
];

function dataBR(ymd: string): string {
  const [a, m, d] = ymd.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

export function ClientePerfilSheet({
  clienteId,
  onFechar,
  onAbrirFotos,
  onPatch,
}: {
  clienteId: string | null;
  onFechar: () => void;
  onAbrirFotos: () => void;
  onPatch: (id: string, p: PatchCliente) => void;
}) {
  const aberto = clienteId !== null;
  const { data: p, refetch, isLoading } = useQuery<Perfil>({
    queryKey: ["cliente-perfil", clienteId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/clientes/${clienteId}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: aberto,
  });

  return (
    <AdminModal aberto={aberto} onFechar={onFechar} titulo="Perfil do cliente" largura="max-w-lg">
      {isLoading || !p ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Conteudo
          p={p}
          refetch={refetch}
          onAbrirFotos={onAbrirFotos}
          onPatch={(patch) => onPatch(p.id, patch)}
        />
      )}
    </AdminModal>
  );
}

function Conteudo({
  p,
  refetch,
  onAbrirFotos,
  onPatch,
}: {
  p: Perfil;
  refetch: () => void;
  onAbrirFotos: () => void;
  onPatch: (p: PatchCliente) => void;
}) {
  const [filtro, setFiltro] = useState<"todos" | StatusAg>("todos");
  const cadastro = new Date(p.criadoEm).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const filtrados =
    filtro === "todos" ? p.agendamentos : p.agendamentos.filter((a) => a.status === filtro);

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            {p.nome}
          </h3>
          {p.vip && (
            <Pill tom="amber">
              <Crown className="size-3" /> VIP
            </Pill>
          )}
          {p.bloqueado && (
            <Pill tom="vermelho">
              <Ban className="size-3" /> Bloqueado
            </Pill>
          )}
          {p.mensalidade?.status === "ativo" && <Pill tom="azul">Mensalista</Pill>}
        </div>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {formatarTelefone(p.telefone)}
          <span className="mx-1.5">·</span>
          <span className="text-xs">desde {cadastro}</span>
        </p>
        {p.bloqueado && p.motivoBloqueio && (
          <p className="mt-1.5 text-xs text-destructive">{p.motivoBloqueio}</p>
        )}
      </div>

      {/* Estatísticas — grade compacta */}
      <div className="grid grid-cols-2 gap-2">
        <Metrica rotulo="Total de cortes" valor={String(p.stats.totalCortes)} />
        <Metrica
          rotulo="Frequência média"
          valor={p.stats.freqMediaDias != null ? `${p.stats.freqMediaDias} dias` : "—"}
        />
        <Metrica rotulo="Último corte" valor={p.stats.ultimoCorte ? dataBR(p.stats.ultimoCorte) : "—"} />
        <Metrica
          rotulo="Sem voltar há"
          valor={p.stats.diasSemVoltar != null ? `${p.stats.diasSemVoltar} dias` : "—"}
        />
      </div>

      {/* Financeiro */}
      <CollapsibleCard titulo="Financeiro" icone={<Wallet className="size-4" />}>
        <div className="space-y-2.5 text-sm">
          <Linha rotulo="Total gasto" valor={formatarPreco(p.stats.totalGasto)} forte />
          {p.mensalidade && (
            <Linha
              rotulo={`Mensalista (dia ${p.mensalidade.diaCobranca})`}
              valor={`${formatarPreco(p.mensalidade.totalCicloAtual)} no ciclo`}
            />
          )}
          {p.assinaturas.length > 0 ? (
            p.assinaturas.map((a, i) => (
              <Linha
                key={i}
                rotulo={a.nome}
                valor={a.usosRestantes != null ? `${a.usosRestantes} usos` : "ativo"}
              />
            ))
          ) : !p.mensalidade ? (
            <p className="text-xs text-muted-foreground">Sem assinaturas ou mensalidade.</p>
          ) : null}
        </div>
      </CollapsibleCard>

      {/* Agendamentos / extrato */}
      <CollapsibleCard
        titulo="Agendamentos"
        icone={<CalendarClock className="size-4" />}
        subtitulo={`${p.agendamentos.length} no total`}
      >
        <div className="-mt-1 mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {FILTROS.map((f) => (
            <button
              key={f.chave}
              onClick={() => setFiltro(f.chave)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filtro === f.chave
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
        {filtrados.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Nada por aqui.</p>
        ) : (
          <ul className="space-y-2">
            {filtrados.map((a) => (
              <LinhaAgendamento key={a.id} a={a} onMudou={refetch} />
            ))}
          </ul>
        )}
      </CollapsibleCard>

      {/* Controle administrativo */}
      <Controle key={p.id} p={p} onMudou={refetch} onPatch={onPatch} onAbrirFotos={onAbrirFotos} />
    </div>
  );
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{rotulo}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">{valor}</p>
    </div>
  );
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{rotulo}</span>
      <span
        className={cn(
          "font-mono tabular-nums",
          forte ? "text-base font-semibold text-foreground" : "text-foreground"
        )}
      >
        {valor}
      </span>
    </div>
  );
}

function LinhaAgendamento({ a, onMudou }: { a: Agendamento; onMudou: () => void }) {
  const [remarcando, setRemarcando] = useState(false);
  const [novaData, setNovaData] = useState(a.data);
  const [novaHora, setNovaHora] = useState(a.horarioInicio);
  const [salvando, setSalvando] = useState(false);
  const ativo = a.status === "agendado";

  async function patch(body: Record<string, unknown>, msg: string) {
    setSalvando(true);
    try {
      const res = await fetch(`/api/admin/agendamentos/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(msg);
      setRemarcando(false);
      onMudou();
    } catch {
      toast.error("Não foi possível atualizar.");
    } finally {
      setSalvando(false);
    }
  }

  const tom =
    a.status === "concluido"
      ? "verde"
      : a.status === "cancelado"
        ? "vermelho"
        : a.status === "nao_compareceu"
          ? "amber"
          : "azul";

  return (
    <li className="rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex w-14 shrink-0 flex-col items-start">
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {a.horarioInicio}
          </span>
          <span className="text-[11px] text-muted-foreground">{dataBR(a.data)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-foreground">
            {a.servicos.join(", ") || "Serviço"}
          </p>
          <Pill tom={tom as never}>{STATUS_LABEL[a.status]}</Pill>
        </div>
        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
          {a.valorTotal > 0 ? formatarPreco(a.valorTotal) : "—"}
        </span>
      </div>

      {ativo && (
        <div className="mt-2 border-t border-border pt-2">
          {remarcando ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="date"
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  className={cn(inputCls, "py-2 text-xs")}
                />
                <input
                  type="time"
                  step={3600}
                  value={novaHora}
                  onChange={(e) => setNovaHora(e.target.value)}
                  className={cn(inputCls, "py-2 text-xs")}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => patch({ data: novaData, horarioInicio: novaHora }, "Remarcado.")}
                  disabled={salvando}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {salvando && <Loader2 className="size-3.5 animate-spin" />} Salvar
                </button>
                <button
                  onClick={() => setRemarcando(false)}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setRemarcando(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Pencil className="size-3.5" /> Remarcar
              </button>
              <button
                onClick={() => patch({ status: "cancelado" }, "Agendamento cancelado.")}
                disabled={salvando}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-60"
              >
                <Ban className="size-3.5" /> Cancelar
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Controle({
  p,
  onMudou,
  onPatch,
  onAbrirFotos,
}: {
  p: Perfil;
  onMudou: () => void;
  onPatch: (patch: PatchCliente) => void;
  onAbrirFotos: () => void;
}) {
  // Estado inicial dos props; remontado por key={p.id} ao trocar de cliente.
  const [obs, setObs] = useState(p.observacoes ?? "");
  const [motivo, setMotivo] = useState(p.motivoBloqueio ?? "");
  const [salvando, setSalvando] = useState<string | null>(null);

  async function patch(body: PatchCliente & { observacoes?: string }, msg: string, chave: string) {
    setSalvando(chave);
    try {
      const res = await fetch(`/api/admin/clientes/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(msg);
      onPatch(body);
      onMudou();
    } catch {
      toast.error("Não foi possível salvar.");
    } finally {
      setSalvando(null);
    }
  }

  const obsMudou = (obs.trim() || null) !== (p.observacoes ?? null);

  return (
    <CollapsibleCard titulo="Controle" icone={<ShieldCheck className="size-4" />}>
      <div className="space-y-4">
        {/* VIP */}
        <Toggle
          ativo={p.vip}
          icone={<Crown className="size-4" />}
          titulo="Cliente VIP"
          descricao="Destaque de prioridade/confiança."
          carregando={salvando === "vip"}
          onToggle={() => patch({ vip: !p.vip }, p.vip ? "VIP removido." : "Marcado como VIP.", "vip")}
        />

        {/* Bloqueio */}
        <div className="rounded-xl border border-border p-3">
          <div className="flex items-center gap-3">
            <Ban className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {p.bloqueado ? "Bloqueado" : "Bloquear de agendar"}
              </p>
              <p className="text-xs text-muted-foreground">
                {p.bloqueado ? "Não consegue marcar pelo site." : "Impede novos agendamentos."}
              </p>
            </div>
          </div>
          {!p.bloqueado && (
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo (ex.: faltas recorrentes)"
              className={cn(inputCls, "mt-2.5 py-2 text-xs")}
            />
          )}
          <button
            onClick={() =>
              patch(
                { bloqueado: !p.bloqueado, motivoBloqueio: motivo.trim() || null },
                p.bloqueado ? "Desbloqueado." : "Cliente bloqueado.",
                "bloqueio"
              )
            }
            disabled={salvando === "bloqueio"}
            className={cn(
              "mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60",
              p.bloqueado
                ? "bg-primary text-primary-foreground"
                : "bg-destructive text-white"
            )}
          >
            {salvando === "bloqueio" && <Loader2 className="size-4 animate-spin" />}
            {p.bloqueado ? (
              <>
                <ShieldCheck className="size-4" /> Desbloquear
              </>
            ) : (
              <>
                <Ban className="size-4" /> Bloquear
              </>
            )}
          </button>
        </div>

        {/* Observações */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Star className="size-3.5" /> Observações / restrições
          </label>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Preferências, restrições, histórico…"
            className={cn(inputCls, "resize-none")}
          />
          {obsMudou && (
            <button
              onClick={() => patch({ observacoes: obs.trim() }, "Observações salvas.", "obs")}
              disabled={salvando === "obs"}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              {salvando === "obs" && <Loader2 className="size-3.5 animate-spin" />} Salvar observações
            </button>
          )}
        </div>

        {/* Fotos */}
        <button
          onClick={onAbrirFotos}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ImageIcon className="size-4" /> Fotos do cliente
        </button>
      </div>
    </CollapsibleCard>
  );
}

function Toggle({
  ativo,
  icone,
  titulo,
  descricao,
  carregando,
  onToggle,
}: {
  ativo: boolean;
  icone: React.ReactNode;
  titulo: string;
  descricao: string;
  carregando: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={carregando}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-60",
        ativo ? "border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/20" : "border-border"
      )}
    >
      <span className={cn("shrink-0", ativo ? "text-amber-500" : "text-muted-foreground")}>
        {carregando ? <Loader2 className="size-4 animate-spin" /> : icone}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{titulo}</p>
        <p className="text-xs text-muted-foreground">{descricao}</p>
      </div>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          ativo ? "bg-amber-400" : "bg-border"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white transition-all",
            ativo ? "left-[18px]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}
