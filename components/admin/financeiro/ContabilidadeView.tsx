"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Wallet,
  Receipt,
  Landmark,
  PiggyBank,
  Repeat,
  TrendingUp,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Power,
  ChevronLeft,
  ArrowDownRight,
  ArrowUpRight,
  Home,
  Droplet,
  Zap,
  Wifi,
  Package,
  Users,
  Wrench,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { FluxoCaixaChart } from "@/components/admin/Charts";
import { AdminModal, Campo, inputCls } from "@/components/admin/AdminModal";
import { formatarPreco } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

// ─── Tipos (espelham as APIs de /api/admin/contabilidade) ───────────────────

type Categoria =
  | "aluguel" | "agua" | "luz" | "internet" | "produtos"
  | "funcionarios" | "impostos" | "manutencao" | "marketing" | "outros";

const CATEGORIAS: { id: Categoria; label: string }[] = [
  { id: "aluguel", label: "Aluguel" },
  { id: "agua", label: "Água" },
  { id: "luz", label: "Luz" },
  { id: "internet", label: "Internet" },
  { id: "produtos", label: "Produtos" },
  { id: "funcionarios", label: "Funcionários" },
  { id: "impostos", label: "Impostos" },
  { id: "manutencao", label: "Manutenção" },
  { id: "marketing", label: "Marketing" },
  { id: "outros", label: "Outros" },
];
const catLabel = (c: string) => CATEGORIAS.find((x) => x.id === c)?.label ?? c;

const CAT_ICON: Record<Categoria, LucideIcon> = {
  aluguel: Home,
  agua: Droplet,
  luz: Zap,
  internet: Wifi,
  produtos: Package,
  funcionarios: Users,
  impostos: Landmark,
  manutencao: Wrench,
  marketing: Megaphone,
  outros: Receipt,
};
const catIcone = (c: string): LucideIcon => CAT_ICON[c as Categoria] ?? Receipt;

type Resumo = {
  receitaBruta: number;
  ajustesEntrada: number;
  ajustesSaida: number;
  despesasTotais: number;
  custoFixo: number;
  custoVariavel: number;
  imposto: number;
  custoOperacional: number;
  lucroLiquido: number;
  margemLiquida: number;
};

type Despesa = {
  id: string;
  nome: string;
  categoria: Categoria;
  valor: number;
  data: string;
  status: "pago" | "pendente";
  observacao: string | null;
  recorrenteId: string | null;
  virtual: boolean;
  fixo: boolean;
  variavel: boolean;
};

type Molde = {
  id: string;
  nome: string;
  categoria: Categoria;
  valor: string;
  diaVencimento: number | null;
  ativo: boolean;
  variavel: boolean;
  observacao: string | null;
};

type Ajuste = {
  id: string;
  data: string;
  valor: string;
  tipo: "entrada" | "saida";
  motivo: string;
};

type Imposto = { modo: "percentual" | "fixo" | "nenhum"; taxa: number | string; valorFixo: number | string };

type Pacote = {
  resumo: Resumo;
  categorias: { categoria: Categoria; total: number }[];
  fluxo: { dia: string; entradas: number; saidas: number }[];
};

const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const num = (v: number | string) => (typeof v === "number" ? v : parseFloat(v) || 0);

type ModalTipo = "imposto" | "ajustes" | "despesas" | null;

// ─── Componente principal ───────────────────────────────────────────────────

export function ContabilidadeView({ mes }: { mes: string }) {
  const [dados, setDados] = useState<Pacote | null>(null);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [moldes, setMoldes] = useState<Molde[]>([]);
  const [ajustes, setAjustes] = useState<Ajuste[]>([]);
  const [imposto, setImposto] = useState<Imposto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState<ModalTipo>(null);
  const [despesasNovo, setDespesasNovo] = useState(false); // abrir modal direto no form

  const carregar = useCallback(async () => {
    try {
      const [r, d, m, a, i] = await Promise.all([
        fetch(`/api/admin/contabilidade/resumo?mes=${mes}`).then((x) => x.json()),
        fetch(`/api/admin/contabilidade/despesas?mes=${mes}`).then((x) => x.json()),
        fetch(`/api/admin/contabilidade/recorrentes`).then((x) => x.json()),
        fetch(`/api/admin/contabilidade/ajustes?mes=${mes}`).then((x) => x.json()),
        fetch(`/api/admin/contabilidade/imposto`).then((x) => x.json()),
      ]);
      setDados(r);
      setDespesas(d);
      setMoldes(m);
      setAjustes(a);
      setImposto(i);
    } catch {
      toast.error("Erro ao carregar contabilidade");
    } finally {
      setCarregando(false);
    }
  }, [mes]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial/ao trocar mês
    carregar();
  }, [carregar]);

  if (carregando || !dados) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const r = dados.resumo;
  const ajusteLiquido = r.ajustesEntrada - r.ajustesSaida;
  const impMode = imposto?.modo ?? "nenhum";
  const impHint =
    impMode === "percentual" ? `${num(imposto?.taxa ?? 0)}% da receita`
    : impMode === "fixo" ? "MEI · valor fixo"
    : "sem imposto";
  const qtdFixas = moldes.filter((m) => m.ativo).length;

  function abrirDespesas(novo: boolean) {
    setDespesasNovo(novo);
    setModal("despesas");
  }

  return (
    <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.05 }} className="space-y-3.5">
      {/* Cards básicos */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
        <Card
          rotulo="Receita bruta"
          valor={formatarPreco(r.receitaBruta)}
          icone={Wallet}
          editar={() => setModal("ajustes")}
          hint={
            ajusteLiquido !== 0
              ? `${ajusteLiquido > 0 ? "+" : "−"}${formatarPreco(Math.abs(ajusteLiquido))} ajuste`
              : undefined
          }
        />
        <Card
          rotulo="Despesas"
          valor={formatarPreco(r.despesasTotais)}
          icone={Receipt}
          tom="alerta"
          acao={() => abrirDespesas(false)}
          adicionar={() => abrirDespesas(true)}
          hint={`${despesas.length} no mês${qtdFixas ? ` · ${qtdFixas} fixas` : ""}`}
        />
        <Card
          rotulo="Imposto"
          valor={formatarPreco(r.imposto)}
          icone={Landmark}
          tom="alerta"
          acao={() => setModal("imposto")}
          hint={impHint}
        />
        <Card
          rotulo="Lucro líquido"
          valor={formatarPreco(r.lucroLiquido)}
          icone={PiggyBank}
          destaque
          hint={`Margem ${Math.round(r.margemLiquida * 100)}%`}
          negativo={r.lucroLiquido < 0}
        />
      </div>

      {/* Chips de custo */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2.5">
        <Chip rotulo="Custo fixo" valor={formatarPreco(r.custoFixo)} icone={Repeat} />
        <Chip rotulo="Custo variável" valor={formatarPreco(r.custoVariavel)} icone={TrendingUp} />
        <Chip rotulo="Operacional" valor={formatarPreco(r.custoOperacional)} icone={Receipt} />
      </motion.div>

      {/* Fluxo de caixa */}
      <motion.section variants={fadeUp} className="rounded-2xl border border-border bg-card p-4 shadow-xs md:p-5">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-heading text-base font-semibold tracking-tight text-foreground">Fluxo de caixa</h2>
          <span className={cn("font-mono text-sm font-semibold tabular-nums", r.lucroLiquido < 0 ? "text-destructive" : "text-foreground")}>
            {formatarPreco(r.lucroLiquido)}
          </span>
        </div>
        <div className="mb-3 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" />Entradas</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: "oklch(0.52 0.17 26)" }} />Saídas</span>
        </div>
        <FluxoCaixaChart dados={dados.fluxo} />
      </motion.section>

      {/* Despesas — lista por nome */}
      <motion.section variants={fadeUp} className="rounded-2xl border border-border bg-card p-4 shadow-xs md:p-5">
        <h3 className="mb-3 font-heading text-base font-semibold tracking-tight text-foreground">Despesas do mês</h3>
        <DespesaBars despesas={despesas} />
      </motion.section>

      {/* Modais */}
      {modal === "imposto" && (
        <ImpostoModal imposto={imposto} onFechar={() => setModal(null)} onSalvo={carregar} />
      )}
      {modal === "ajustes" && (
        <AjustesModal mes={mes} ajustes={ajustes} onFechar={() => setModal(null)} onMudou={carregar} />
      )}
      {modal === "despesas" && (
        <DespesasModal
          mes={mes}
          despesas={despesas}
          moldes={moldes}
          iniciarNovo={despesasNovo}
          onFechar={() => setModal(null)}
          onMudou={carregar}
        />
      )}
    </motion.div>
  );
}

// ─── Cards / chips ──────────────────────────────────────────────────────────

function Card({
  rotulo, valor, icone: Icone, destaque, hint, tom, negativo, acao, editar, adicionar,
}: {
  rotulo: string; valor: string; icone: LucideIcon;
  destaque?: boolean; hint?: string; tom?: "alerta"; negativo?: boolean;
  acao?: () => void; editar?: () => void; adicionar?: () => void;
}) {
  const clicavel = !!acao;
  const CornerIcon = adicionar ? Plus : editar ? Pencil : null;
  const cornerFn = adicionar ?? editar;
  return (
    <motion.div
      variants={fadeUp}
      onClick={acao}
      role={clicavel ? "button" : undefined}
      tabIndex={clicavel ? 0 : undefined}
      onKeyDown={clicavel ? (e) => (e.key === "Enter" || e.key === " ") && acao?.() : undefined}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 shadow-xs transition-all",
        destaque ? "col-span-2 border-primary bg-primary lg:col-span-1" : "border-border bg-card",
        clicavel && "cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:scale-[0.98]"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-[11px] font-medium uppercase tracking-wide", destaque ? "text-primary-foreground/70" : "text-muted-foreground/80")}>
          {rotulo}
        </span>
        {CornerIcon && cornerFn ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); cornerFn(); }}
            aria-label={adicionar ? `Adicionar ${rotulo}` : `Editar ${rotulo}`}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <CornerIcon className="size-3.5" />
          </button>
        ) : (
          <span className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-lg",
            destaque ? "bg-primary-foreground/15 text-primary-foreground"
              : tom === "alerta" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-muted/70 text-muted-foreground"
          )}>
            <Icone className="size-3.5" />
          </span>
        )}
      </div>
      <span className={cn(
        "mt-2 block font-mono font-semibold tabular-nums tracking-tight",
        destaque ? cn("text-[26px] md:text-4xl", negativo ? "text-red-300" : "text-primary-foreground")
          : "text-[21px] text-foreground md:text-[26px]"
      )}>
        {valor}
      </span>
      {hint && (
        <p className={cn(
          "mt-0.5 flex items-center gap-1 truncate text-[11px]",
          destaque ? "text-primary-foreground/75" : "text-muted-foreground"
        )}>
          {clicavel && !adicionar && <Pencil className="size-2.5 shrink-0" />}
          {hint}
        </p>
      )}
    </motion.div>
  );
}

function Chip({ rotulo, valor, icone: Icone }: { rotulo: string; valor: string; icone: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-xs">
      <Icone className="size-3.5 text-muted-foreground" />
      <p className="mt-1.5 truncate font-mono text-sm font-semibold tabular-nums text-foreground">{valor}</p>
      <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground/80">{rotulo}</p>
    </div>
  );
}

function DespesaBars({ despesas }: { despesas: Despesa[] }) {
  if (!despesas.length) return <p className="py-6 text-center text-sm text-muted-foreground">Sem despesas no mês.</p>;
  const ordenadas = [...despesas].sort((a, b) => b.valor - a.valor);
  const max = Math.max(...ordenadas.map((d) => d.valor));
  return (
    <ul className="space-y-2.5">
      {ordenadas.map((d, i) => (
        <li key={d.id}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="truncate text-sm font-medium text-foreground">{d.nome}</span>
              <span className="ml-1.5 text-[11px] text-muted-foreground/70">{catLabel(d.categoria)}</span>
            </div>
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-foreground">{formatarPreco(d.valor)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(d.valor / max) * 100}%` }}
              transition={{ duration: 0.7, delay: 0.1 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Imposto (modal) ────────────────────────────────────────────────────────

function ImpostoModal({ imposto, onFechar, onSalvo }: { imposto: Imposto | null; onFechar: () => void; onSalvo: () => void }) {
  const [modo, setModo] = useState<Imposto["modo"]>(imposto?.modo ?? "nenhum");
  const [taxa, setTaxa] = useState(String(num(imposto?.taxa ?? 0)));
  const [valorFixo, setValorFixo] = useState(String(num(imposto?.valorFixo ?? 0)));
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    try {
      const res = await fetch("/api/admin/contabilidade/imposto", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo, taxa: parseFloat(taxa) || 0, valorFixo: parseFloat(valorFixo) || 0 }),
      });
      if (!res.ok) throw new Error();
      toast.success("Imposto salvo");
      onSalvo();
      onFechar();
    } catch {
      toast.error("Erro ao salvar imposto");
    } finally {
      setSalvando(false);
    }
  }

  const OPCOES: { id: Imposto["modo"]; label: string; desc: string }[] = [
    { id: "percentual", label: "Taxa %", desc: "Percentual sobre a receita bruta" },
    { id: "fixo", label: "MEI fixo", desc: "Valor fixo mensal (ex.: DAS)" },
    { id: "nenhum", label: "Nenhum", desc: "Sem imposto" },
  ];

  return (
    <AdminModal aberto onFechar={onFechar} titulo="Imposto">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {OPCOES.map((o) => (
            <button
              key={o.id}
              onClick={() => setModo(o.id)}
              className={cn(
                "rounded-xl border px-2 py-2.5 text-center text-sm font-medium transition-all",
                modo === o.id ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{OPCOES.find((o) => o.id === modo)?.desc}</p>

        {modo === "percentual" && (
          <Campo rotulo="Taxa (%)">
            <input type="number" inputMode="decimal" min={0} max={100} step="0.1" value={taxa} onChange={(e) => setTaxa(e.target.value)} className={inputCls} autoFocus />
          </Campo>
        )}
        {modo === "fixo" && (
          <Campo rotulo="Valor mensal (R$)">
            <input type="number" inputMode="decimal" min={0} step="0.01" value={valorFixo} onChange={(e) => setValorFixo(e.target.value)} className={inputCls} autoFocus />
          </Campo>
        )}

        <button onClick={salvar} disabled={salvando} className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-60">
          {salvando && <Loader2 className="size-4 animate-spin" />} Salvar
        </button>
      </div>
    </AdminModal>
  );
}

// ─── Despesas (modal único: abas Do mês / Fixas + form) ─────────────────────

type Alvo =
  | { tipo: "novo" }
  | { tipo: "despesa"; d: Despesa }
  | { tipo: "molde"; m: Molde };

type FormDespesa = {
  nome: string; categoria: Categoria; valor: string; data: string;
  status: "pago" | "pendente"; observacao: string;
  recorrente: boolean; variavel: boolean; dia: string;
};

function DespesasModal({
  mes, despesas, moldes, iniciarNovo, onFechar, onMudou,
}: {
  mes: string; despesas: Despesa[]; moldes: Molde[];
  iniciarNovo: boolean; onFechar: () => void; onMudou: () => void;
}) {
  const [aba, setAba] = useState<"mes" | "fixas">("mes");
  const [alvo, setAlvo] = useState<Alvo | null>(iniciarNovo ? { tipo: "novo" } : null);

  return (
    <AdminModal
      aberto
      onFechar={onFechar}
      titulo={alvo ? (alvo.tipo === "molde" ? "Despesa fixa" : alvo.tipo === "despesa" ? "Editar despesa" : "Nova despesa") : "Despesas"}
    >
      {alvo ? (
        <DespesaForm
          mes={mes}
          alvo={alvo}
          onVoltar={() => setAlvo(null)}
          onSalvo={() => { setAlvo(null); onMudou(); }}
        />
      ) : (
        <div className="space-y-4">
          {/* Abas + adicionar */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-full border border-border bg-muted/50 p-1">
              {(["mes", "fixas"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setAba(t)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                    aba === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t === "mes" ? "Do mês" : "Fixas"}
                </button>
              ))}
            </div>
            <button
              onClick={() => setAlvo({ tipo: "novo" })}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-all hover:opacity-90 active:scale-95"
            >
              <Plus className="size-4" /> Despesa
            </button>
          </div>

          {aba === "mes" ? (
            <ListaDoMes despesas={despesas} onEditar={(d) => setAlvo({ tipo: "despesa", d })} onMudou={onMudou} />
          ) : (
            <ListaFixas moldes={moldes} onEditar={(m) => setAlvo({ tipo: "molde", m })} onMudou={onMudou} />
          )}
        </div>
      )}
    </AdminModal>
  );
}

function ListaDoMes({ despesas, onEditar, onMudou }: { despesas: Despesa[]; onEditar: (d: Despesa) => void; onMudou: () => void }) {
  async function remover(d: Despesa) {
    if (d.virtual) {
      toast.error("Recorrente: edite ou desative na aba Fixas");
      return;
    }
    if (!confirm(`Excluir "${d.nome}"?`)) return;
    const res = await fetch(`/api/admin/contabilidade/despesas/${d.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Despesa excluída"); onMudou(); } else toast.error("Erro ao excluir");
  }

  if (!despesas.length) return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma despesa neste mês.</p>;
  const ordenadas = [...despesas].sort((a, b) => b.valor - a.valor);
  return (
    <ul className="space-y-2">
      {ordenadas.map((d) => {
        const CatIcone = catIcone(d.categoria);
        const aviso = d.virtual && d.variavel ? "estimativa" : d.status === "pendente" ? "pendente" : null;
        return (
          <li key={d.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background p-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <CatIcone className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                {d.fixo && <Repeat className="size-3 shrink-0 text-muted-foreground" />}
                {d.nome}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>{catLabel(d.categoria)}</span>
                <span className="text-muted-foreground/50">·</span>
                <span className="font-mono">{d.data.slice(8)}/{d.data.slice(5, 7)}</span>
                {aviso && (
                  <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                    {aviso}
                  </span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{formatarPreco(d.valor)}</span>
              <div className="flex items-center gap-0.5">
                <button onClick={() => onEditar(d)} aria-label="Editar" className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Pencil className="size-3.5" />
                </button>
                {!d.virtual && (
                  <button onClick={() => remover(d)} aria-label="Excluir" className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ListaFixas({ moldes, onEditar, onMudou }: { moldes: Molde[]; onEditar: (m: Molde) => void; onMudou: () => void }) {
  async function toggle(m: Molde) {
    const res = await fetch(`/api/admin/contabilidade/recorrentes/${m.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ativo: !m.ativo }),
    });
    if (res.ok) onMudou(); else toast.error("Erro");
  }
  async function remover(m: Molde) {
    if (!confirm(`Excluir despesa fixa "${m.nome}"?`)) return;
    const res = await fetch(`/api/admin/contabilidade/recorrentes/${m.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Excluída"); onMudou(); } else toast.error("Erro");
  }

  if (!moldes.length)
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma despesa fixa. Crie uma marcando &quot;recorrente&quot;.</p>;
  const ordenados = [...moldes].sort((a, b) => num(b.valor) - num(a.valor));
  return (
    <ul className="space-y-2">
      {ordenados.map((m) => {
        const CatIcone = catIcone(m.categoria);
        return (
          <li key={m.id} className={cn("flex items-center gap-3 rounded-xl border border-border/60 bg-background p-3", !m.ativo && "opacity-50")}>
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <CatIcone className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{m.nome}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>{catLabel(m.categoria)}</span>
                <span className="text-muted-foreground/50">·</span>
                <span>{m.variavel ? "variável" : "fixo"}</span>
                {m.diaVencimento ? <><span className="text-muted-foreground/50">·</span><span>dia {m.diaVencimento}</span></> : null}
                {!m.ativo && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">inativa</span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {m.variavel ? "~" : ""}{formatarPreco(num(m.valor))}
              </span>
              <div className="flex items-center gap-0.5">
                <button onClick={() => onEditar(m)} aria-label="Editar" className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Pencil className="size-3.5" />
                </button>
                <button onClick={() => toggle(m)} aria-label={m.ativo ? "Desativar" : "Ativar"} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Power className="size-3.5" />
                </button>
                <button onClick={() => remover(m)} aria-label="Excluir" className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function DespesaForm({ mes, alvo, onVoltar, onSalvo }: { mes: string; alvo: Alvo; onVoltar: () => void; onSalvo: () => void }) {
  const inicial: FormDespesa =
    alvo.tipo === "despesa"
      ? { nome: alvo.d.nome, categoria: alvo.d.categoria, valor: String(alvo.d.valor), data: alvo.d.data, status: alvo.d.status, observacao: alvo.d.observacao ?? "", recorrente: false, variavel: false, dia: "" }
      : alvo.tipo === "molde"
        ? { nome: alvo.m.nome, categoria: alvo.m.categoria, valor: String(num(alvo.m.valor)), data: `${mes}-01`, status: "pago", observacao: alvo.m.observacao ?? "", recorrente: true, variavel: alvo.m.variavel, dia: alvo.m.diaVencimento ? String(alvo.m.diaVencimento) : "" }
        : { nome: "", categoria: "outros", valor: "", data: `${mes}-01`, status: "pago", observacao: "", recorrente: false, variavel: false, dia: "" };

  const [form, setForm] = useState<FormDespesa>(inicial);
  const [salvando, setSalvando] = useState(false);
  const editandoMolde = alvo.tipo === "molde";
  const recorrenteTravado = editandoMolde; // editar molde: sempre recorrente

  async function salvar() {
    const valor = parseFloat(form.valor);
    if (!form.nome || !valor || valor <= 0) { toast.error("Preencha nome e valor"); return; }
    setSalvando(true);
    try {
      let res: Response;
      const recorrente = form.recorrente || recorrenteTravado;
      if (alvo.tipo === "molde") {
        res = await fetch(`/api/admin/contabilidade/recorrentes/${alvo.m.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: form.nome, categoria: form.categoria, valor, diaVencimento: form.dia ? Number(form.dia) : null, variavel: form.variavel, observacao: form.observacao }),
        });
      } else if (alvo.tipo === "despesa") {
        res = await fetch(`/api/admin/contabilidade/despesas/${encodeURIComponent(alvo.d.id)}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: form.nome, categoria: form.categoria, valor, data: form.data, status: form.status, observacao: form.observacao }),
        });
      } else if (recorrente) {
        res = await fetch("/api/admin/contabilidade/recorrentes", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: form.nome, categoria: form.categoria, valor, diaVencimento: form.dia ? Number(form.dia) : undefined, dataInicio: `${mes}-01`, variavel: form.variavel, observacao: form.observacao }),
        });
      } else {
        res = await fetch("/api/admin/contabilidade/despesas", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: form.nome, categoria: form.categoria, valor, data: form.data, status: form.status, observacao: form.observacao }),
        });
      }
      if (!res.ok) throw new Error();
      toast.success("Despesa salva");
      onSalvo();
    } catch {
      toast.error("Erro ao salvar despesa");
    } finally {
      setSalvando(false);
    }
  }

  const mostraRecorrente = form.recorrente || recorrenteTravado;

  return (
    <div className="space-y-3">
      <button onClick={onVoltar} className="-mt-1 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeft className="size-4" /> Voltar
      </button>

      <Campo rotulo="Nome">
        <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputCls} placeholder="Ex.: Gasolina" autoFocus />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Categoria">
          <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as Categoria })} className={inputCls}>
            {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Campo>
        <Campo rotulo={mostraRecorrente && form.variavel ? "Valor estimado (R$)" : "Valor (R$)"}>
          <input type="number" inputMode="decimal" min={0} step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} className={inputCls} />
        </Campo>
      </div>

      {!mostraRecorrente && (
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Data">
            <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className={inputCls} />
          </Campo>
          <Campo rotulo="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "pago" | "pendente" })} className={inputCls}>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
            </select>
          </Campo>
        </div>
      )}

      {/* Recorrência (só ao criar; ao editar molde fica travado em recorrente) */}
      {alvo.tipo === "novo" && (
        <label className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-background px-3.5 py-3">
          <input type="checkbox" checked={form.recorrente} onChange={(e) => setForm({ ...form, recorrente: e.target.checked })} className="size-4 accent-[var(--primary)]" />
          <span className="text-sm text-foreground">Recorrente (repete todo mês)</span>
        </label>
      )}

      {mostraRecorrente && (
        <>
          <label className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-background px-3.5 py-3">
            <input type="checkbox" checked={form.variavel} onChange={(e) => setForm({ ...form, variavel: e.target.checked })} className="mt-0.5 size-4 accent-[var(--primary)]" />
            <span className="text-sm text-foreground">
              Valor varia a cada mês
              <span className="block text-xs text-muted-foreground">Luz, gasolina, alimentação. O valor acima vira estimativa; confirme o real no mês.</span>
            </span>
          </label>
          <Campo rotulo="Dia do vencimento (opcional)">
            <input type="number" inputMode="numeric" min={1} max={31} value={form.dia} onChange={(e) => setForm({ ...form, dia: e.target.value })} className={inputCls} placeholder="Ex.: 10" />
          </Campo>
        </>
      )}

      <Campo rotulo="Observação (opcional)">
        <input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} className={inputCls} />
      </Campo>

      <button onClick={salvar} disabled={salvando} className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-60">
        {salvando && <Loader2 className="size-4 animate-spin" />} Salvar
      </button>
    </div>
  );
}

// ─── Ajustes manuais (modal, via lápis do card Receita) ─────────────────────

function AjustesModal({ mes, ajustes, onFechar, onMudou }: { mes: string; ajustes: Ajuste[]; onFechar: () => void; onMudou: () => void }) {
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const v = parseFloat(valor);
    if (!v || v <= 0 || !motivo) { toast.error("Preencha valor e motivo"); return; }
    setSalvando(true);
    try {
      const res = await fetch("/api/admin/contabilidade/ajustes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, valor: v, motivo, data: `${mes}-01` }),
      });
      if (!res.ok) throw new Error();
      toast.success("Ajuste salvo");
      setValor(""); setMotivo(""); onMudou();
    } catch {
      toast.error("Erro ao salvar ajuste");
    } finally {
      setSalvando(false);
    }
  }
  async function remover(id: string) {
    const res = await fetch(`/api/admin/contabilidade/ajustes/${id}`, { method: "DELETE" });
    if (res.ok) onMudou(); else toast.error("Erro");
  }

  return (
    <AdminModal aberto onFechar={onFechar} titulo="Ajustar faturamento">
      <div className="space-y-4">
        <div className="space-y-3 rounded-xl border border-border/60 bg-background p-3.5">
          <div className="inline-flex w-full rounded-full border border-border bg-muted/50 p-1">
            {(["entrada", "saida"] as const).map((t) => (
              <button key={t} onClick={() => setTipo(t)} className={cn("flex-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors", tipo === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {t === "entrada" ? "Entrada" : "Saída"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_1.4fr] gap-3">
            <Campo rotulo="Valor (R$)">
              <input type="number" inputMode="decimal" min={0} step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} className={inputCls} />
            </Campo>
            <Campo rotulo="Motivo">
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputCls} placeholder="Ex.: Correção de caixa" />
            </Campo>
          </div>
          <button onClick={salvar} disabled={salvando} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-60">
            {salvando && <Loader2 className="size-4 animate-spin" />} Adicionar ajuste
          </button>
        </div>

        {ajustes.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhum ajuste neste mês.</p>
        ) : (
          <ul className="space-y-1.5">
            {ajustes.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background px-3 py-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {a.tipo === "entrada"
                    ? <ArrowUpRight className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    : <ArrowDownRight className="size-4 shrink-0 text-destructive" />}
                  <p className="truncate text-sm font-medium text-foreground">{a.motivo}</p>
                </div>
                <span className={cn("shrink-0 font-mono text-sm font-semibold tabular-nums", a.tipo === "entrada" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                  {a.tipo === "entrada" ? "+" : "−"}{formatarPreco(num(a.valor))}
                </span>
                <button onClick={() => remover(a.id)} aria-label="Excluir" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminModal>
  );
}
