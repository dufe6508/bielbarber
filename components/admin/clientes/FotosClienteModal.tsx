"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AdminModal } from "@/components/admin/AdminModal";

type Foto = {
  id: string;
  urlImagem: string;
  legenda: string | null;
  criadoEm: string;
};

export function FotosClienteModal({
  clienteId,
  clienteNome,
  onFechar,
}: {
  clienteId: string | null;
  clienteNome: string;
  onFechar: () => void;
}) {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!clienteId) return;
    const t = setTimeout(async () => {
      setCarregando(true);
      try {
        const r = await fetch(`/api/admin/clientes/${clienteId}/fotos`);
        setFotos(await r.json());
      } catch {
        toast.error("Erro ao carregar fotos.");
      } finally {
        setCarregando(false);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [clienteId]);

  async function enviar(file: File) {
    if (!clienteId) return;
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/clientes/${clienteId}/fotos`, {
        method: "POST",
        body: fd,
      });
      const nova = await res.json();
      if (!res.ok) throw new Error(nova.error);
      setFotos((prev) => [nova, ...prev]);
      toast.success("Foto adicionada.");
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Falha no upload.");
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remover(id: string) {
    if (!confirm("Remover esta foto?")) return;
    setFotos((prev) => prev.filter((f) => f.id !== id));
    await fetch(`/api/admin/clientes/fotos/${id}`, { method: "DELETE" }).catch(() =>
      toast.error("Erro ao remover.")
    );
  }

  return (
    <AdminModal
      aberto={clienteId !== null}
      onFechar={onFechar}
      titulo={`Fotos — ${clienteNome}`}
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Galeria privada do barbeiro. O cliente não vê estas fotos.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) enviar(f);
          }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={enviando}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
        >
          {enviando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Adicionar foto
        </button>

        {carregando ? (
          <div className="grid grid-cols-3 gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : fotos.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma foto ainda.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {fotos.map((f) => (
              <div
                key={f.id}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
              >
                <img
                  src={f.urlImagem}
                  alt={f.legenda ?? "Foto do cliente"}
                  className="size-full object-cover"
                />
                <button
                  onClick={() => remover(f.id)}
                  className="absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded-lg bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remover foto"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminModal>
  );
}
