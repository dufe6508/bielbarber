"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, Lock, X } from "lucide-react";
import { useMounted } from "@/lib/hooks/useMounted";

// Modal de entrada do admin — disparada pelo long-press no logo.
// Discreta: sem rótulos "admin" visíveis até abrir. Segurança real é o servidor.
export function AdminPinModal({
  aberto,
  onFechar,
}: {
  aberto: boolean;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const montado = useMounted();

  useEffect(() => {
    if (aberto) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, onFechar]);

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
      onFechar();
      router.push("/admin");
      router.refresh();
    } catch {
      setErro(true);
      setSenha("");
      inputRef.current?.focus();
    } finally {
      setEnviando(false);
    }
  }

  if (!montado) return null;

  return createPortal(
    <AnimatePresence>
      {aberto && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={onFechar}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
          />

          <motion.form
            onSubmit={entrar}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={onFechar}
              className="absolute right-3.5 top-3.5 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>

            <div className="mb-5 flex flex-col items-center text-center">
              <span className="mb-3 inline-flex size-11 items-center justify-center rounded-xl border border-border bg-muted/60">
                <Lock className="size-5 text-foreground" />
              </span>
              <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                Acesso restrito
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Área do barbeiro.
              </p>
            </div>

            <input
              ref={inputRef}
              type="password"
              inputMode="text"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                setErro(false);
              }}
              placeholder="Senha"
              aria-invalid={erro}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center font-mono text-base tracking-wider text-foreground outline-none transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/15 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/15"
            />

            <AnimatePresence>
              {erro && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 text-center text-xs font-medium text-destructive"
                >
                  Senha incorreta.
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={enviando || !senha}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {enviando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Entrar"
              )}
            </button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
