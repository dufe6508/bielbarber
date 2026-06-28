"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { Logo } from "@/components/Logo";

// Rota direta de login (fallback). A entrada principal é o long-press no logo,
// mas /admin/login funciona caso o barbeiro prefira a URL.
export default function AdminLoginPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando || !senha) return;
    setEnviando(true);
    setErro(false);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (!res.ok) throw new Error();
      router.push("/admin");
      router.refresh();
    } catch {
      setErro(true);
      setSenha("");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-background p-6">
      <form
        onSubmit={entrar}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-xl"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-4 inline-flex rounded-full ring-1 ring-border">
            <Logo className="size-14 rounded-full" />
          </span>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Biel Barber Shop
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-3.5" />
            Painel do barbeiro
          </p>
        </div>

        <input
          type="password"
          autoComplete="current-password"
          autoFocus
          value={senha}
          onChange={(e) => {
            setSenha(e.target.value);
            setErro(false);
          }}
          placeholder="Senha"
          aria-invalid={erro}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center font-mono text-base tracking-wider text-foreground outline-none transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/15 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/15"
        />

        {erro && (
          <p className="mt-2 text-center text-xs font-medium text-destructive">
            Senha incorreta.
          </p>
        )}

        <button
          type="submit"
          disabled={enviando || !senha}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          {enviando ? <Loader2 className="size-4 animate-spin" /> : "Entrar"}
        </button>
      </form>
    </main>
  );
}
