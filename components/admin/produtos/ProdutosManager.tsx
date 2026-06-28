"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Pencil,
  Plus,
  Power,
  Trash2,
  Star,
  Package,
  AlertTriangle,
  ImagePlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AdminModal, Campo, inputCls } from "@/components/admin/AdminModal";
import { Pill } from "@/components/admin/primitives";
import { formatarPreco } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: string;
  precoAntigo: string | null;
  quantidadeEstoque: number;
  urlImagem: string | null;
  categoria: string | null;
  badge: string | null;
  destaque: boolean;
  ativo: boolean;
  ordem: number;
};

const VAZIO = {
  nome: "",
  descricao: "",
  preco: 0,
  precoAntigo: 0,
  quantidadeEstoque: 0,
  urlImagem: "",
  categoria: "",
  badge: "",
  destaque: false,
  ativo: true,
  ordem: 0,
};

export function ProdutosManager() {
  const [lista, setLista] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...VAZIO });
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function enviarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-selecionar o mesmo arquivo
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem acima de 5 MB.");
      return;
    }
    setEnviandoFoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/produtos/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setForm((f) => ({ ...f, urlImagem: j.url }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function carregar() {
    setCarregando(true);
    try {
      const r = await fetch("/api/admin/produtos");
      setLista(await r.json());
    } catch {
      toast.error("Erro ao carregar produtos.");
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

  function abrirEdicao(p: Produto) {
    setEditId(p.id);
    setForm({
      nome: p.nome,
      descricao: p.descricao ?? "",
      preco: parseFloat(p.preco),
      precoAntigo: p.precoAntigo ? parseFloat(p.precoAntigo) : 0,
      quantidadeEstoque: p.quantidadeEstoque,
      urlImagem: p.urlImagem ?? "",
      categoria: p.categoria ?? "",
      badge: p.badge ?? "",
      destaque: p.destaque,
      ativo: p.ativo,
      ordem: p.ordem,
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
      const url = editId ? `/api/admin/produtos/${editId}` : "/api/admin/produtos";
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(editId ? "Produto atualizado." : "Produto criado.");
      setModal(false);
      carregar();
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(p: Produto) {
    setLista((prev) => prev.map((x) => (x.id === p.id ? { ...x, ativo: !x.ativo } : x)));
    await fetch(`/api/admin/produtos/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !p.ativo }),
    }).catch(() => toast.error("Erro."));
  }

  async function remover(p: Produto) {
    if (!confirm(`Remover "${p.nome}"?`)) return;
    const res = await fetch(`/api/admin/produtos/${p.id}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (j.desativado) toast.info("Produto já vendido, foi desativado.");
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
          Novo produto
        </button>
      </div>

      {carregando ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhum produto cadastrado.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((p) => {
            const semEstoque = p.quantidadeEstoque <= 0;
            return (
              <motion.div
                key={p.id}
                layout
                className={cn(
                  "overflow-hidden rounded-2xl border bg-card shadow-xs transition-shadow hover:shadow-sm",
                  p.ativo ? "border-border" : "border-border/60 opacity-70"
                )}
              >
                <div className="relative aspect-[4/3] bg-muted">
                  {p.urlImagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.urlImagem}
                      alt={p.nome}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground/40">
                      <Package className="size-10" />
                    </div>
                  )}
                  <div className="absolute left-2 top-2 flex gap-1.5">
                    {p.destaque && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        <Star className="size-2.5" /> destaque
                      </span>
                    )}
                    {p.badge && (
                      <span className="rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur">
                        {p.badge}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-heading text-sm font-semibold text-foreground">
                        {p.nome}
                      </h3>
                      {p.categoria && (
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {p.categoria}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-mono text-base font-semibold tabular-nums text-foreground">
                        {formatarPreco(p.preco)}
                      </span>
                      {p.precoAntigo && (
                        <span className="block font-mono text-[11px] text-muted-foreground line-through">
                          {formatarPreco(p.precoAntigo)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Pill tom={semEstoque ? "vermelho" : "neutro"}>
                      {semEstoque ? (
                        <>
                          <AlertTriangle className="size-3" /> sem estoque
                        </>
                      ) : (
                        `${p.quantidadeEstoque} em estoque`
                      )}
                    </Pill>
                    {!p.ativo && <Pill tom="vermelho">inativo</Pill>}
                  </div>

                  <div className="mt-3 flex items-center gap-1 border-t border-border/60 pt-3">
                    <button
                      onClick={() => abrirEdicao(p)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="size-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => alternarAtivo(p)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
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
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AdminModal
        aberto={modal}
        onFechar={() => setModal(false)}
        titulo={editId ? "Editar produto" : "Novo produto"}
      >
        <div className="space-y-4">
          <Campo rotulo="Nome">
            <input
              className={inputCls}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Pomada, Óleo de barba…"
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
          <Campo rotulo="Foto do produto">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={enviarFoto}
              className="hidden"
            />
            {form.urlImagem ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.urlImagem} alt="Prévia" className="size-full object-cover" />
                {enviandoFoto && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                    <Loader2 className="size-5 animate-spin text-foreground" />
                  </div>
                )}
                <div className="absolute right-2 top-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex size-8 items-center justify-center rounded-lg bg-card/90 text-foreground shadow-sm backdrop-blur hover:bg-card"
                    aria-label="Trocar foto"
                  >
                    <ImagePlus className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, urlImagem: "" }))}
                    className="inline-flex size-8 items-center justify-center rounded-lg bg-card/90 text-destructive shadow-sm backdrop-blur hover:bg-card"
                    aria-label="Remover foto"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={enviandoFoto}
                className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-60"
              >
                {enviandoFoto ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="size-7" />
                    <span className="text-sm font-medium">Escolher foto</span>
                    <span className="text-xs text-muted-foreground/80">Galeria ou câmera · até 5 MB</span>
                  </>
                )}
              </button>
            )}
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
            <Campo rotulo="Preço antigo (promo)">
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
                value={form.precoAntigo}
                onChange={(e) =>
                  setForm({ ...form, precoAntigo: Number(e.target.value) })
                }
              />
            </Campo>
            <Campo rotulo="Estoque">
              <input
                type="number"
                min="0"
                className={inputCls}
                value={form.quantidadeEstoque}
                onChange={(e) =>
                  setForm({ ...form, quantidadeEstoque: Number(e.target.value) })
                }
              />
            </Campo>
            <Campo rotulo="Categoria">
              <input
                className={inputCls}
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                placeholder="Cabelo, Barba…"
              />
            </Campo>
          </div>
          <Campo rotulo="Badge (selo curto)">
            <input
              className={inputCls}
              value={form.badge}
              onChange={(e) => setForm({ ...form, badge: e.target.value })}
              placeholder="Novo, Mais vendido…"
            />
          </Campo>

          <div className="flex flex-wrap gap-5">
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
            {editId ? "Salvar alterações" : "Criar produto"}
          </button>
        </div>
      </AdminModal>
    </div>
  );
}
