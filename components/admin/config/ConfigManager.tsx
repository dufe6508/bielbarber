"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Lock, Store, Upload } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/15";

function Secao({
  icone,
  titulo,
  children,
}: {
  icone: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-xs">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icone}
        </span>
        <h2 className="font-heading text-base font-semibold tracking-tight text-foreground">
          {titulo}
        </h2>
      </div>
      {children}
    </section>
  );
}

export function ConfigManager() {
  const [carregando, setCarregando] = useState(true);

  // Perfil
  const [nome, setNome] = useState("");
  const [local, setLocal] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Senha
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((d) => {
        setNome(d.nome ?? "");
        setLocal(d.local ?? "");
        setLogoUrl(d.logoUrl ?? "");
      })
      .catch(() => toast.error("Erro ao carregar."))
      .finally(() => setCarregando(false));
  }, []);

  async function salvarPerfil() {
    if (!nome.trim()) {
      toast.error("Informe o nome da barbearia.");
      return;
    }
    setSalvandoPerfil(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, local, logoUrl }),
      });
      if (!res.ok) throw new Error();
      toast.success("Perfil salvo.");
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSalvandoPerfil(false);
    }
  }

  async function enviarLogo(file: File) {
    setEnviandoLogo(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/perfil/logo", { method: "POST", body: form });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error);
      setLogoUrl(d.url);
      // Persiste já — assim o logo vale mesmo sem clicar em "Salvar perfil".
      await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: d.url }),
      });
      toast.success("Logo atualizado.");
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Erro no upload.");
    } finally {
      setEnviandoLogo(false);
    }
  }

  async function salvarSenha() {
    if (nova.length < 4) {
      toast.error("A nova senha precisa ter ao menos 4 caracteres.");
      return;
    }
    if (nova !== confirma) {
      toast.error("A confirmação não bate com a nova senha.");
      return;
    }
    setSalvandoSenha(true);
    try {
      const res = await fetch("/api/admin/senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atual, nova }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error);
      toast.success("Senha alterada.");
      setAtual("");
      setNova("");
      setConfirma("");
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Erro ao alterar.");
    } finally {
      setSalvandoSenha(false);
    }
  }

  if (carregando) {
    return <div className="h-80 animate-pulse rounded-2xl bg-muted" />;
  }

  return (
    <div className="space-y-5">
      {/* ── Perfil da barbearia ─────────────────────────────── */}
      <Secao icone={<Store className="size-4" />} titulo="Barbearia">
        <div className="mb-5 flex items-center gap-4">
          <span className="inline-flex size-16 shrink-0 overflow-hidden rounded-2xl ring-1 ring-border">
            <Logo key={logoUrl} src={logoUrl || undefined} className="size-16 rounded-2xl" />
          </span>
          <div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={enviandoLogo}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              {enviandoLogo ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Trocar logo
            </button>
            <p className="mt-1.5 text-xs text-muted-foreground">PNG ou JPG, até 5 MB.</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) enviarLogo(f);
              e.target.value = "";
            }}
          />
        </div>

        <div className="space-y-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Biel Barber"
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Localização</span>
            <input
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="Vale do Jatobá · BH"
              className={inputCls}
            />
          </label>
        </div>

        <button
          onClick={salvarPerfil}
          disabled={salvandoPerfil}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          {salvandoPerfil ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Salvar perfil
        </button>
      </Secao>

      {/* ── Segurança ───────────────────────────────────────── */}
      <Secao icone={<Lock className="size-4" />} titulo="Senha do admin">
        <div className="space-y-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Senha atual</span>
            <input
              type="password"
              value={atual}
              onChange={(e) => setAtual(e.target.value)}
              autoComplete="current-password"
              className={inputCls}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Nova senha</span>
              <input
                type="password"
                value={nova}
                onChange={(e) => setNova(e.target.value)}
                autoComplete="new-password"
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Confirmar</span>
              <input
                type="password"
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                autoComplete="new-password"
                className={inputCls}
              />
            </label>
          </div>
        </div>

        <button
          onClick={salvarSenha}
          disabled={salvandoSenha || !atual || !nova}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          {salvandoSenha ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Alterar senha
        </button>
      </Secao>
    </div>
  );
}
