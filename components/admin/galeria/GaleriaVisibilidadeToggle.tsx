"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Olhinho: liga/desliga a aba "Galeria" para o cliente (config global).
export function GaleriaVisibilidadeToggle() {
  const [visivel, setVisivel] = useState<boolean | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/admin/config");
        const j = await r.json();
        setVisivel(j.galeriaVisivel !== false);
      } catch {
        setVisivel(true);
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function alternar() {
    if (visivel === null || salvando) return;
    const novo = !visivel;
    setVisivel(novo);
    setSalvando(true);
    try {
      const r = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ galeriaVisivel: novo }),
      });
      if (!r.ok) throw new Error();
      toast.success(novo ? "Galeria visível para o cliente." : "Galeria oculta do cliente.");
    } catch {
      setVisivel(!novo);
      toast.error("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  const off = visivel === false;

  return (
    <button
      onClick={alternar}
      disabled={visivel === null || salvando}
      aria-pressed={!off}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-60",
        off
          ? "border-border text-muted-foreground hover:text-foreground"
          : "border-primary/30 bg-accent/60 text-foreground"
      )}
      title={off ? "Galeria oculta — tocar para mostrar" : "Galeria visível — tocar para ocultar"}
    >
      {salvando ? (
        <Loader2 className="size-4 animate-spin" />
      ) : off ? (
        <EyeOff className="size-4" />
      ) : (
        <Eye className="size-4" />
      )}
      {off ? "Oculta" : "Visível"}
    </button>
  );
}
