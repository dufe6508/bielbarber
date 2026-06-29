"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Star,
  Copy,
  Check,
  Images,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AdminModal, Campo, inputCls } from "@/components/admin/AdminModal";
import { Pill } from "@/components/admin/primitives";
import { formatarPreco } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Imagem = { id: string; urlImagem: string; ordem: number; destaque: boolean };
type Categoria = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  precoMedio: string | null;
  imagemCapa: string | null;
  servicoId: string | null;
  destaque: boolean;
  ativo: boolean;
  ordem: number;
  imagens: Imagem[];
  _count: { imagens: number };
};
type Servico = { id: string; nome: string };

const VAZIO = {
  nome: "",
  descricao: "",
  precoMedio: 0,
  imagemCapa: "",
  servicoId: "",
  destaque: false,
  ativo: true,
  ordem: 0,
};

export function GaleriaManager() {
  const [lista, setLista] = useState<Categoria[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [expandida, setExpandida] = useState<string | null>(null);

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...VAZIO });
  const [salvando, setSalvando] = useState(false);
  const [enviandoCapa, setEnviandoCapa] = useState(false);
  const capaRef = useRef<HTMLInputElement>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const [rc, rs] = await Promise.all([
        fetch("/api/admin/galeria"),
        fetch("/api/admin/servicos"),
      ]);
      setLista(await rc.json());
      setServicos(rs.ok ? await rs.json() : []);
    } catch {
      toast.error("Erro ao carregar a galeria.");
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

  function abrirEdicao(c: Categoria) {
    setEditId(c.id);
    setForm({
      nome: c.nome,
      descricao: c.descricao ?? "",
      precoMedio: c.precoMedio ? parseFloat(c.precoMedio) : 0,
      imagemCapa: c.imagemCapa ?? "",
      servicoId: c.servicoId ?? "",
      destaque: c.destaque,
      ativo: c.ativo,
      ordem: c.ordem,
    });
    setModal(true);
  }

  async function enviarCapa(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem acima de 5 MB.");
    setEnviandoCapa(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/produtos/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setForm((f) => ({ ...f, imagemCapa: j.url }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setEnviandoCapa(false);
    }
  }

  async function salvar() {
    if (!form.nome.trim()) return toast.error("Informe o nome.");
    setSalvando(true);
    try {
      const url = editId ? `/api/admin/galeria/${editId}` : "/api/admin/galeria";
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, servicoId: form.servicoId || null }),
      });
      if (!res.ok) throw new Error();
      toast.success(editId ? "Categoria atualizada." : "Categoria criada.");
      setModal(false);
      carregar();
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(c: Categoria) {
    setLista((prev) => prev.map((x) => (x.id === c.id ? { ...x, ativo: !x.ativo } : x)));
    await fetch(`/api/admin/galeria/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !c.ativo }),
    }).catch(() => toast.error("Erro."));
  }

  async function remover(c: Categoria) {
    if (!confirm(`Remover "${c.nome}" e todas as suas fotos?`)) return;
    await fetch(`/api/admin/galeria/${c.id}`, { method: "DELETE" });
    carregar();
  }

  // Reordena trocando o campo `ordem` com o vizinho.
  async function mover(c: Categoria, dir: -1 | 1) {
    const idx = lista.findIndex((x) => x.id === c.id);
    const alvo = idx + dir;
    if (alvo < 0 || alvo >= lista.length) return;
    const outro = lista[alvo];
    await Promise.all([
      fetch(`/api/admin/galeria/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordem: outro.ordem }),
      }),
      fetch(`/api/admin/galeria/${outro.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordem: c.ordem }),
      }),
    ]);
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
          Nova categoria
        </button>
      </div>

      {carregando ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhuma categoria cadastrada.
        </p>
      ) : (
        <div className="space-y-3">
          {lista.map((c, idx) => (
            <motion.div
              key={c.id}
              layout
              className={cn(
                "overflow-hidden rounded-2xl border bg-card shadow-xs",
                c.ativo ? "border-border" : "border-border/60 opacity-70"
              )}
            >
              {/* Cabeçalho da categoria */}
              <div className="flex items-center gap-3 p-3">
                <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {c.imagemCapa ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imagemCapa} alt={c.nome} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground/40">
                      <Images className="size-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-heading text-sm font-semibold text-foreground">
                      {c.nome}
                    </h3>
                    {c.destaque && (
                      <Pill tom="azul">
                        <Star className="size-2.5" /> destaque
                      </Pill>
                    )}
                    {!c.ativo && <Pill tom="vermelho">inativo</Pill>}
                  </div>
                  <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-mono">{c._count.imagens} fotos</span>
                    {c.precoMedio && (
                      <span className="font-mono tabular-nums">{formatarPreco(c.precoMedio)}</span>
                    )}
                  </p>
                </div>

                {/* Reordenar */}
                <div className="flex shrink-0 flex-col">
                  <button
                    onClick={() => mover(c, -1)}
                    disabled={idx === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-25"
                    aria-label="Mover para cima"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    onClick={() => mover(c, 1)}
                    disabled={idx === lista.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-25"
                    aria-label="Mover para baixo"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>

                <button
                  onClick={() => setExpandida(expandida === c.id ? null : c.id)}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Expandir"
                >
                  {expandida === c.id ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </button>
              </div>

              {/* Painel expandido */}
              {expandida === c.id && (
                <div className="border-t border-border/60 p-3">
                  <LinkPreview slug={c.slug} />

                  <div className="mt-3 flex flex-wrap items-center gap-1">
                    <button
                      onClick={() => abrirEdicao(c)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="size-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => alternarAtivo(c)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {c.ativo ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      onClick={() => remover(c)}
                      className="ml-auto inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  <ImagensCategoria categoria={c} onMudou={carregar} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de edição/criação de categoria */}
      <AdminModal
        aberto={modal}
        onFechar={() => setModal(false)}
        titulo={editId ? "Editar categoria" : "Nova categoria"}
      >
        <div className="space-y-4">
          <Campo rotulo="Nome">
            <input
              className={inputCls}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Corte Americano, Low Fade…"
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

          <Campo rotulo="Imagem de capa">
            <input ref={capaRef} type="file" accept="image/*" onChange={enviarCapa} className="hidden" />
            {form.imagemCapa ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.imagemCapa} alt="Prévia" className="size-full object-cover" />
                {enviandoCapa && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                    <Loader2 className="size-5 animate-spin text-foreground" />
                  </div>
                )}
                <div className="absolute right-2 top-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => capaRef.current?.click()}
                    className="inline-flex size-8 items-center justify-center rounded-lg bg-card/90 text-foreground shadow-sm backdrop-blur hover:bg-card"
                    aria-label="Trocar capa"
                  >
                    <ImagePlus className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, imagemCapa: "" }))}
                    className="inline-flex size-8 items-center justify-center rounded-lg bg-card/90 text-destructive shadow-sm backdrop-blur hover:bg-card"
                    aria-label="Remover capa"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => capaRef.current?.click()}
                disabled={enviandoCapa}
                className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-60"
              >
                {enviandoCapa ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="size-7" />
                    <span className="text-sm font-medium">Escolher capa</span>
                    <span className="text-xs text-muted-foreground/80">até 5 MB</span>
                  </>
                )}
              </button>
            )}
          </Campo>

          <div className="grid grid-cols-2 gap-4">
            <Campo rotulo="Preço médio (R$)">
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
                value={form.precoMedio}
                onChange={(e) => setForm({ ...form, precoMedio: Number(e.target.value) })}
              />
            </Campo>
            <Campo rotulo="Serviço vinculado">
              <select
                className={inputCls}
                value={form.servicoId}
                onChange={(e) => setForm({ ...form, servicoId: e.target.value })}
              >
                <option value="">Nenhum</option>
                {servicos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

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
            {editId ? "Salvar alterações" : "Criar categoria"}
          </button>
        </div>
      </AdminModal>
    </div>
  );
}

// Preview copiável do deep link.
function LinkPreview({ slug }: { slug: string }) {
  const [copiado, setCopiado] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/galeria/${slug}`
      : `/galeria/${slug}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <span className="truncate font-mono">{`/galeria/${slug}`}</span>
      {copiado ? (
        <Check className="ml-auto size-3.5 shrink-0 text-success-muted-foreground" />
      ) : (
        <Copy className="ml-auto size-3.5 shrink-0" />
      )}
    </button>
  );
}

// Grade de imagens da categoria: upload em batch, toggle destaque, remover.
function ImagensCategoria({
  categoria,
  onMudou,
}: {
  categoria: Categoria;
  onMudou: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function enviar(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setEnviando(true);
    let erros = 0;
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        erros++;
        continue;
      }
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/galeria/${categoria.id}/imagens`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) erros++;
    }
    setEnviando(false);
    if (erros) toast.error(`${erros} imagem(ns) falharam.`);
    else toast.success("Fotos enviadas.");
    onMudou();
  }

  async function alternarDestaque(img: Imagem) {
    await fetch(`/api/admin/galeria/imagens/${img.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destaque: !img.destaque }),
    });
    onMudou();
  }

  async function removerImg(img: Imagem) {
    await fetch(`/api/admin/galeria/imagens/${img.id}`, { method: "DELETE" });
    onMudou();
  }

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Fotos</span>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={enviar} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={enviando}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60"
        >
          {enviando ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
          Adicionar fotos
        </button>
      </div>

      {categoria.imagens.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
          Nenhuma foto ainda.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {categoria.imagens.map((img) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.urlImagem} alt="" className="size-full object-cover" />
              <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                <button
                  type="button"
                  onClick={() => alternarDestaque(img)}
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-md shadow-sm backdrop-blur",
                    img.destaque
                      ? "bg-primary text-primary-foreground"
                      : "bg-card/90 text-muted-foreground hover:text-foreground"
                  )}
                  aria-label="Alternar destaque"
                >
                  <Star className="size-3.5" fill={img.destaque ? "currentColor" : "none"} />
                </button>
                <button
                  type="button"
                  onClick={() => removerImg(img)}
                  className="inline-flex size-7 items-center justify-center rounded-md bg-card/90 text-destructive shadow-sm backdrop-blur hover:bg-card"
                  aria-label="Remover foto"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
