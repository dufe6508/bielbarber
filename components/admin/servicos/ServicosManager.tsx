"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Loader2, Pencil, Plus, Power, Trash2, Users, Clock } from "lucide-react";
import { toast } from "sonner";
import { AdminModal, Campo, inputCls } from "@/components/admin/AdminModal";
import { Pill } from "@/components/admin/primitives";
import { formatarPreco } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Servico = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: string;
  duracaoMinutos: number;
  slotsNecessarios: number;
  capacidadePorSlot: number;
  ativo: boolean;
  ordem: number;
};

const VAZIO = {
  nome: "",
  descricao: "",
  preco: 0,
  duracaoMinutos: 30,
  slotsNecessarios: 1,
  capacidadePorSlot: 1,
  ativo: true,
  ordem: 0,
};

export function ServicosManager() {
  const [lista, setLista] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...VAZIO });
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const r = await fetch("/api/admin/servicos");
      setLista(await r.json());
    } catch {
      toast.error("Erro ao carregar serviços.");
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

  function abrirEdicao(s: Servico) {
    setEditId(s.id);
    setForm({
      nome: s.nome,
      descricao: s.descricao ?? "",
      preco: parseFloat(s.preco),
      duracaoMinutos: s.duracaoMinutos,
      slotsNecessarios: s.slotsNecessarios,
      capacidadePorSlot: s.capacidadePorSlot,
      ativo: s.ativo,
      ordem: s.ordem,
    });
    setModal(true);
  }

  async function salvar() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome.");
      return;
    }
    setSalvando(true);
    try {
      const url = editId ? `/api/admin/servicos/${editId}` : "/api/admin/servicos";
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(editId ? "Serviço atualizado." : "Serviço criado.");
      setModal(false);
      carregar();
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(s: Servico) {
    setLista((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, ativo: !x.ativo } : x))
    );
    await fetch(`/api/admin/servicos/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !s.ativo }),
    }).catch(() => toast.error("Erro ao alterar."));
  }

  async function remover(s: Servico) {
    if (!confirm(`Remover permanentemente "${s.nome}"? Esta ação não pode ser desfeita.`)) return;
    await fetch(`/api/admin/servicos/${s.id}`, { method: "DELETE" });
    toast.success("Serviço removido.");
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
          Novo serviço
        </button>
      </div>

      {carregando ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhum serviço cadastrado.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {lista.map((s) => (
            <motion.div
              key={s.id}
              layout
              className={cn(
                "rounded-2xl border bg-card p-4 shadow-xs transition-shadow hover:shadow-sm",
                s.ativo ? "border-border" : "border-border/60 opacity-70"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-heading text-base font-semibold text-foreground">
                    {s.nome}
                  </h3>
                  {s.descricao && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {s.descricao}
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-mono text-lg font-semibold tabular-nums text-foreground">
                  {formatarPreco(s.preco)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Pill tom="neutro">
                  <Clock className="size-3" /> {s.duracaoMinutos}min
                </Pill>
                {s.slotsNecessarios > 1 && (
                  <Pill tom="azul">{s.slotsNecessarios} slots</Pill>
                )}
                {s.capacidadePorSlot > 1 && (
                  <Pill tom="verde">
                    <Users className="size-3" /> {s.capacidadePorSlot}/horário
                  </Pill>
                )}
                {!s.ativo && <Pill tom="vermelho">inativo</Pill>}
              </div>

              <div className="mt-3 flex items-center gap-1 border-t border-border/60 pt-3">
                <button
                  onClick={() => abrirEdicao(s)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="size-3.5" /> Editar
                </button>
                <button
                  onClick={() => alternarAtivo(s)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Power className="size-3.5" /> {s.ativo ? "Desativar" : "Ativar"}
                </button>
                <button
                  onClick={() => remover(s)}
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
        titulo={editId ? "Editar serviço" : "Novo serviço"}
      >
        <div className="space-y-4">
          <Campo rotulo="Nome">
            <input
              className={inputCls}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Corte, Barba…"
            />
          </Campo>
          <Campo rotulo="Descrição (opcional)">
            <textarea
              className={inputCls}
              rows={2}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </Campo>
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
            <Campo rotulo="Duração (min)">
              <input
                type="number"
                min="5"
                step="5"
                className={inputCls}
                value={form.duracaoMinutos}
                onChange={(e) =>
                  setForm({ ...form, duracaoMinutos: Number(e.target.value) })
                }
              />
            </Campo>
            <Campo rotulo="Slots de 1h ocupados">
              <input
                type="number"
                min="1"
                max="4"
                className={inputCls}
                value={form.slotsNecessarios}
                onChange={(e) =>
                  setForm({ ...form, slotsNecessarios: Number(e.target.value) })
                }
              />
            </Campo>
            <Campo rotulo="Clientes por horário">
              <input
                type="number"
                min="1"
                max="6"
                className={inputCls}
                value={form.capacidadePorSlot}
                onChange={(e) =>
                  setForm({ ...form, capacidadePorSlot: Number(e.target.value) })
                }
              />
            </Campo>
          </div>

          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              className="size-4 rounded border-border accent-primary"
            />
            <span className="text-sm text-foreground">Ativo (visível no agendamento)</span>
          </label>

          <button
            onClick={salvar}
            disabled={salvando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {salvando && <Loader2 className="size-4 animate-spin" />}
            {editId ? "Salvar alterações" : "Criar serviço"}
          </button>
        </div>
      </AdminModal>
    </div>
  );
}
