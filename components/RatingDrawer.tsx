"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function RatingDrawer({
  open,
  onOpenChange,
  agendamentoId,
  telefone,
  onAvaliado,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agendamentoId: string;
  telefone: string;
  onAvaliado: (rating: number) => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  function handleOpenChange(v: boolean) {
    onOpenChange(v);
    if (!v) {
      setRating(0);
      setHover(0);
      setComentario("");
    }
  }

  async function enviar() {
    if (rating < 1) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/agendamentos/${agendamentoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "avaliar",
          rating,
          ratingComentario: comentario.trim() || undefined,
          telefone,
        }),
      });
      const dados = await res.json();
      if (!res.ok) {
        toast.error(dados.error ?? "Não foi possível enviar a avaliação.");
        return;
      }
      toast.success("Obrigado pela avaliação!");
      onAvaliado(rating);
      handleOpenChange(false);
    } catch {
      toast.error("Erro de conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  const ativo = hover || rating;

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-foreground/50 backdrop-blur-[2px]" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92vh] max-w-md flex-col rounded-t-3xl border border-border bg-background outline-none">
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-border" />

          <div className="overflow-y-auto px-6 pb-8 pt-4">
            <Drawer.Title className="font-heading text-xl font-semibold tracking-tight text-foreground">
              Como foi o corte?
            </Drawer.Title>
            <p className="mt-1 text-sm text-muted-foreground">
              Sua avaliação ajuda a manter o padrão.
            </p>

            <div className="mt-6 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
                  className="p-1 transition-transform active:scale-90"
                >
                  <Star
                    className={cn(
                      "size-9 transition-colors",
                      n <= ativo
                        ? "fill-primary text-primary"
                        : "text-muted-foreground/40"
                    )}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Quer comentar algo? (opcional)"
              rows={3}
              maxLength={500}
              className="mt-6 w-full resize-none rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-ring"
            />

            <button
              type="button"
              onClick={enviar}
              disabled={rating < 1 || enviando}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-[transform,filter] hover:brightness-[1.10] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {enviando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Enviar avaliação"
              )}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
