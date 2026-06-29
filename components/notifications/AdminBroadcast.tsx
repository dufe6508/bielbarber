"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

const CATEGORIAS = [
  { v: "sistema", r: "Aviso geral" },
  { v: "promocoes", r: "Promoção" },
  { v: "loja", r: "Loja" },
  { v: "agenda", r: "Agenda" },
] as const;

// Composer de mensagem do admin para todos os clientes ativos (inbox + push).
export function AdminBroadcast() {
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [categoria, setCategoria] = useState<string>("sistema");
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (titulo.trim().length < 2 || mensagem.trim().length < 2) {
      toast.error("Preencha título e mensagem.");
      return;
    }
    setEnviando(true);
    try {
      const r = await fetch("/api/admin/notificacoes/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, mensagem, categoria }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Falha ao enviar");
      toast.success(`Enviado para ${d.enviadas} cliente(s).`);
      setTitulo("");
      setMensagem("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      <p className="text-xs text-muted-foreground">
        Envie um aviso para todos os clientes ativos (sino + push).
      </p>

      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        maxLength={80}
        placeholder="Título (ex.: Fechado na segunda)"
        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary"
      />
      <textarea
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        maxLength={280}
        rows={3}
        placeholder="Mensagem…"
        className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary"
      />

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIAS.map((c) => (
          <button
            key={c.v}
            onClick={() => setCategoria(c.v)}
            className={cnChip(categoria === c.v)}
          >
            {c.r}
          </button>
        ))}
      </div>

      <button
        onClick={enviar}
        disabled={enviando}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Enviar para todos
      </button>
    </div>
  );
}

function cnChip(ativo: boolean): string {
  return [
    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
    ativo
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
  ].join(" ");
}
