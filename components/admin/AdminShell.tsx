"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ativarPushAdmin } from "@/lib/notifications/subscribe-client";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, Loader2, MapPin, MoreHorizontal, X } from "lucide-react";
import { navAdmin, rotaAtivaAdmin } from "@/lib/navAdmin";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { cn } from "@/lib/utils";

// Itens primários no bottom nav (mobile). O resto vai pro sheet "Mais".
const PRIMARIOS = ["/admin", "/admin/agendamentos", "/admin/agenda", "/admin/clientes", "/admin/financeiro"];

type Perfil = { nome: string; local: string; logoUrl: string };

export function AdminShell({
  children,
  perfil,
}: {
  children: React.ReactNode;
  perfil: Perfil;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  const [maisAberto, setMaisAberto] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);

  useEffect(() => { ativarPushAdmin(); }, []);

  // Sessão deslizante: revalida/renova o cookie ao montar e sempre que o app
  // volta ao foco (reabrir o PWA). Mantém o admin logado até o logout manual.
  useEffect(() => {
    const pingar = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/admin/session", { cache: "no-store" }).catch(() => {});
    };
    pingar();
    document.addEventListener("visibilitychange", pingar);
    window.addEventListener("focus", pingar);
    return () => {
      document.removeEventListener("visibilitychange", pingar);
      window.removeEventListener("focus", pingar);
    };
  }, []);

  const primarios = navAdmin.filter((i) => PRIMARIOS.includes(i.href));
  const secundarios = navAdmin.filter((i) => !PRIMARIOS.includes(i.href));
  const atualTitulo =
    navAdmin.find((i) => rotaAtivaAdmin(pathname, i.href))?.rotulo ?? "Painel";
  const algumSecundarioAtivo = secundarios.some((i) =>
    rotaAtivaAdmin(pathname, i.href)
  );

  async function sair() {
    setSaindo(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setSaindo(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] w-full bg-background">
      {/* ── Sidebar (desktop) ─────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-[100dvh] w-[244px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-[68px] shrink-0 items-center gap-3 px-5">
          <span className="inline-flex shrink-0 rounded-full ring-1 ring-sidebar-border">
            <Logo src={perfil.logoUrl} className="size-9 rounded-full" />
          </span>
          <div className="flex flex-col leading-none">
            <span className="font-heading text-[15px] font-bold tracking-tight text-sidebar-foreground">
              {perfil.nome}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-sidebar-foreground/45">
              Painel
            </span>
          </div>
        </div>

        <div className="mx-4 h-px bg-sidebar-border" />

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3">
          {navAdmin.map((item) => {
            const Icone = item.icone;
            const ativo = rotaAtivaAdmin(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  ativo
                    ? "text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/55 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                {ativo && (
                  <motion.div
                    layoutId="admin-nav-pill"
                    className="absolute inset-0 rounded-xl bg-sidebar-primary"
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                  />
                )}
                <Icone
                  className="relative size-[18px] shrink-0"
                  strokeWidth={ativo ? 2.4 : 2}
                  aria-hidden="true"
                />
                <span className="relative whitespace-nowrap">{item.rotulo}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mx-4 h-px bg-sidebar-border" />

        <div className="flex items-center gap-2 px-4 py-3.5">
          <button
            onClick={() => setConfirmandoSaida(true)}
            disabled={saindo}
            className="inline-flex flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-sidebar-foreground/55 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground disabled:opacity-60"
          >
            {saindo ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            Sair
          </button>
          <ThemeToggle className="text-sidebar-foreground/40 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground" />
        </div>

        <div className="flex items-center gap-1.5 px-5 pb-4 text-[10px] text-sidebar-foreground/30">
          <MapPin className="size-3 shrink-0" />
          {perfil.local}
        </div>
      </aside>

      {/* ── Coluna principal ──────────────────────────────────── */}
      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
        {/* Top bar (mobile) — limpa, sem pills */}
        <header className="sticky top-0 z-40 shrink-0 border-b border-border/60 bg-background/85 backdrop-blur-xl md:hidden">
          <div className="flex h-14 items-center gap-3 px-4">
            <Logo src={perfil.logoUrl} className="size-8 rounded-full ring-1 ring-border" />
            <div className="flex min-w-0 flex-col leading-none">
              <span className="truncate font-heading text-base font-semibold tracking-tight text-foreground">
                {atualTitulo}
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.28em] text-muted-foreground/60">
                {perfil.nome}
              </span>
            </div>
            <NotificationCenter audiencia="admin" className="ml-auto" />
          </div>
        </header>

        {/* Sino (desktop) — fixo no canto superior direito */}
        <div className="fixed top-4 right-4 z-40 hidden md:block">
          <NotificationCenter
            audiencia="admin"
            className="size-10 rounded-xl border border-sidebar-border bg-card shadow-md hover:bg-accent"
          />
        </div>

        <main className="relative flex-1 overflow-x-hidden pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </div>

      {/* ── Bottom nav (mobile) ───────────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="flex items-stretch">
          {primarios.map((item) => {
            const Icone = item.icone;
            const ativo = rotaAtivaAdmin(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
              >
                {ativo && (
                  <motion.span
                    layoutId="admin-bottom-pill"
                    className="absolute -top-px h-0.5 w-9 rounded-full bg-primary"
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  />
                )}
                <Icone
                  className={cn(
                    "size-[21px] transition-colors",
                    ativo ? "text-foreground" : "text-muted-foreground/70"
                  )}
                  strokeWidth={ativo ? 2.3 : 2}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    ativo ? "text-foreground" : "text-muted-foreground/70"
                  )}
                >
                  {item.rotulo}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setMaisAberto(true)}
            className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
          >
            <MoreHorizontal
              className={cn(
                "size-[21px]",
                algumSecundarioAtivo ? "text-foreground" : "text-muted-foreground/70"
              )}
            />
            <span
              className={cn(
                "text-[10px] font-medium",
                algumSecundarioAtivo ? "text-foreground" : "text-muted-foreground/70"
              )}
            >
              Mais
            </span>
          </button>
        </div>
      </nav>

      {/* ── Sheet "Mais" ──────────────────────────────────────── */}
      <AnimatePresence>
        {maisAberto && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMaisAberto(false)}
              aria-label="Fechar"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className="relative w-full rounded-t-3xl border-t border-border bg-card px-5 pt-3 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-2xl"
            >
              {/* Grab handle — affordância de arraste */}
              <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />

              <div className="mb-4 flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
                    Mais opções
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Cadastros e gestão do painel
                  </span>
                </div>
                <button
                  onClick={() => setMaisAberto(false)}
                  className="-mr-1.5 inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Fechar"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {secundarios.map((item) => {
                  const Icone = item.icone;
                  const ativo = rotaAtivaAdmin(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMaisAberto(false)}
                      aria-current={ativo ? "page" : undefined}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-2xl border px-2 py-3.5 text-center transition-colors",
                        ativo
                          ? "border-primary/40 bg-accent/60"
                          : "border-border/60 bg-muted/40 hover:bg-muted"
                      )}
                    >
                      <Icone
                        className={cn(
                          "size-[22px]",
                          ativo ? "text-primary" : "text-muted-foreground"
                        )}
                        strokeWidth={ativo ? 2.3 : 2}
                      />
                      <span
                        className={cn(
                          "text-[11px] font-medium leading-tight",
                          ativo ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {item.rotulo}
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Footer do sheet — conta e preferências */}
              <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3">
                <button
                  onClick={() => {
                    setMaisAberto(false);
                    setConfirmandoSaida(true);
                  }}
                  disabled={saindo}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/70 disabled:opacity-60"
                >
                  {saindo ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                  Sair
                </button>
                <ThemeToggle className="size-11 shrink-0 rounded-xl bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal de confirmação de saída ─────────────────────── */}
      <AnimatePresence>
        {confirmandoSaida && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              onClick={() => setConfirmandoSaida(false)}
              aria-label="Cancelar"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              role="dialog"
              aria-modal="true"
              className="relative w-full max-w-xs rounded-3xl border border-border bg-card p-6 shadow-2xl"
            >
              <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-foreground">
                <LogOut className="size-5" />
              </span>
              <h2 className="text-center font-heading text-lg font-semibold tracking-tight text-foreground">
                Sair do painel?
              </h2>
              <p className="mt-1.5 text-center text-sm text-muted-foreground">
                Você voltará para a área do cliente.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={sair}
                  disabled={saindo}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {saindo ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                  Sair
                </button>
                <button
                  onClick={() => setConfirmandoSaida(false)}
                  disabled={saindo}
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
