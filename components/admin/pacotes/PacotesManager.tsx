"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Loader2,
  Pencil,
  Plus,
  Power,
  Trash2,
  Star,
  RefreshCw,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { AdminModal, Campo, inputCls } from "@/components/admin/AdminModal";
import { Pill } from "@/components/admin/primitives";
import { formatarPreco } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type ServicoMin = { id: string; nome: string };
type Pacote = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: "quantidade" | "combo";
  preco: string;
  validadeDias: number | null;
  quantidadeTotal: number | null;
  quantidadeMensal: number | null;
  limiteSemanal: number | null;
  renovavel: boolean;
  destaque: boolean;
  ativo: boolean;
  ordem: number;
  servicos: { servicoId: string; servico?: { nome: string } }[];
};

const VAZIO = {
  nome: "",
  descricao: "",
  tipo: "combo" as "combo" | "quantidade",
  preco: 0,
  validadeDias: 30,
  quantidadeTotal: 0,
  quantidadeMensal: 0,
  limiteSemanal: 0,
  renovavel: false,
  destaque: false,
  ativo: true,
  ordem: 0,
  servicoIds: [] as string[],
};

export function PacotesManager() {
  const [lista, setLista] = useState<Pacote[]>([]);
  const [servicos, setServicos] = useState<ServicoMin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...VAZIO });
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const [rp, rs] = await Promise.all([
        fetch("/api/admin/pacotes"),
        fetch("/api/admin/servicos"),
      ]);
      setLista(await rp.json());
      const servs = await rs.json();
      setServicos(servs.map((s: ServicoMin) => ({ id: s.id, nome: s.nome })));
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

  function abrirNovo() {
    setEditId(null);
    setForm({ ...VAZIO, ordem: lista.length });
    setModal(true);
  }

  function abrirEdicao(p: Pacote) {
    setEditId(p.id);
    setForm({
      nome: p.nome,
      descricao: p.descricao ?? "",
      tipo: p.tipo,
      preco: parseFloat(p.preco),
      validadeDias: p.validadeDias ?? 0,
      quantidadeTotal: p.quantidadeTotal ?? 0,
      quantidadeMensal: p.quantidadeMensal ?? 0,
      limiteSemanal: p.limiteSemanal ?? 0,
      renovavel: p.renovavel,
      destaque: p.destaque,
      ativo: p.ativo,
      ordem: p.ordem,
      servicoIds: p.servicos.map((s) => s.servicoId),
    });
    setModal(true);
  }

  function alternarServico(id: string) {
    setForm((f) => ({
      ...f,
      servicoIds: f.servicoIds.includes(id)
        ? f.servicoIds.filter((x) => x !== id)
        : [...f.servicoIds, id],
    }));
  }

  async function salvar() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome.");
      return;
    }
    setSalvando(true);
    try {
      const url = editId ? `/api/admin/pacotes/${editId}` : "/api/admin/pacotes";
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(editId ? "Plano atualizado." : "Plano criado.");
      setModal(false);
      carregar();
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(p: Pacote) {
    setLista((prev) => prev.map((x) => (x.id === p.id ? { ...x, ativo: !x.ativo } : x)));
    await fetch(`/api/admin/pacotes/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !p.ativo }),
    }).catch(() => toast.error("Erro."));
  }

  async function remover(p: Pacote) {
    if (!confirm(`Remover "${p.nome}"?`)) return;
    const res = await fetch(`/api/admin/pacotes/${p.id}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (j.desativado) toast.info("Plano já vendido, foi desativado.");
    carregar();
  }

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <button
          onClick={abrirNovo}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95"
        >
          <Plus className="size-4" />
          Novo plano
        </button>
      </div>

      {carregando ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhum plano cadastrado.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((p) => (
            <motion.div
              key={p.id}
              layout
              className={cn(
                "flex flex-col rounded-2xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm",
                p.destaque ? "border-primary/50 ring-1 ring-primary/20" : "border-border",
                !p.ativo && "opacity-70"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-heading text-base font-semibold text-foreground">
                  {p.nome}
                </h3>
                {p.destaque && <Star className="size-4 shrink-0 text-primary" />}
              </div>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
                {formatarPreco(p.preco)}
                {p.renovavel && (
                  <span className="text-sm font-normal text-muted-foreground">/mês</span>
                )}
              </p>
              {p.descricao && (
                <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                  {p.descricao}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Pill tom="azul">{p.tipo}</Pill>
                {p.quantidadeTotal ? (
                  <Pill tom="neutro">{p.quantidadeTotal} cortes</Pill>
                ) : null}
                {p.quantidadeMensal ? (
                  <Pill tom="neutro">{p.quantidadeMensal}/mês</Pill>
                ) : null}
                {p.limiteSemanal ? (
                  <Pill tom="neutro">máx {p.limiteSemanal}/sem</Pill>
                ) : null}
                {p.renovavel && (
                  <Pill tom="verde">
                    <RefreshCw className="size-3" /> renova
                  </Pill>
                )}
                {!p.ativo && <Pill tom="vermelho">inativo</Pill>}
              </div>

              {p.servicos.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {p.servicos.map((s) => s.servico?.nome).filter(Boolean).join(" · ")}
                </p>
              )}

              <div className="mt-auto flex items-center gap-1 border-t border-border/60 pt-3">
                <button
                  onClick={() => abrirEdicao(p)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="size-3.5" /> Editar
                </button>
                <button
                  onClick={() => alternarAtivo(p)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Power className="size-3.5" />
                </button>
                <button
                  onClick={() => remover(p)}
                  className="ml-auto inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AdminModal
        aberto={modal}
        onFechar={() => setModal(false)}
        titulo={editId ? "Editar plano" : "Novo plano"}
      >
        <div className="space-y-4">
          <Campo rotulo="Nome">
            <input
              className={inputCls}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Corte Premium…"
            />
          </Campo>
          <Campo rotulo="Descrição">
            <textarea
              className={inputCls}
              rows={2}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </Campo>

          <div className="flex gap-2">
            {(["combo", "quantidade"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, tipo: t })}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                  form.tipo === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {t === "combo" ? "Combo (serviços)" : "Quantidade (X cortes)"}
              </button>
            ))}
          </div>

          {form.tipo === "quantidade" && (
            <Campo rotulo="Quantidade total de cortes (ex.: 5)">
              <input
                type="number"
                min="1"
                className={inputCls}
                value={form.quantidadeTotal}
                onChange={(e) =>
                  setForm({ ...form, quantidadeTotal: Number(e.target.value) })
                }
              />
            </Campo>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Campo rotulo="Preço (R$)">
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: Number(e.target.value) })}
              />
            </Campo>
            <Campo rotulo="Validade (dias)">
              <input
                type="number"
                min="0"
                className={inputCls}
                value={form.validadeDias}
                onChange={(e) =>
                  setForm({ ...form, validadeDias: Number(e.target.value) })
                }
              />
            </Campo>
            <Campo rotulo="Qtd. por mês">
              <input
                type="number"
                min="0"
                className={inputCls}
                value={form.quantidadeMensal}
                onChange={(e) =>
                  setForm({ ...form, quantidadeMensal: Number(e.target.value) })
                }
              />
            </Campo>
            <Campo rotulo="Limite por semana">
              <input
                type="number"
                min="0"
                className={inputCls}
                value={form.limiteSemanal}
                onChange={(e) =>
                  setForm({ ...form, limiteSemanal: Number(e.target.value) })
                }
              />
            </Campo>
          </div>

          <Campo rotulo="Serviços inclusos">
            <div className="flex flex-wrap gap-2">
              {servicos.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  Cadastre serviços primeiro.
                </span>
              )}
              {servicos.map((s) => {
                const on = form.servicoIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => alternarServico(s.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {on && <Check className="size-3" />}
                    {s.nome}
                  </button>
                );
              })}
            </div>
          </Campo>

          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.renovavel}
                onChange={(e) => setForm({ ...form, renovavel: e.target.checked })}
                className="size-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground">Renova mensalmente</span>
            </label>
            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.destaque}
                onChange={(e) => setForm({ ...form, destaque: e.target.checked })}
                className="size-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground">Destaque</span>
            </label>
            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                className="size-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground">Ativo</span>
            </label>
          </div>

          <button
            onClick={salvar}
            disabled={salvando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {salvando && <Loader2 className="size-4 animate-spin" />}
            {editId ? "Salvar alterações" : "Criar plano"}
          </button>
        </div>
      </AdminModal>
    </div>
  );
}
