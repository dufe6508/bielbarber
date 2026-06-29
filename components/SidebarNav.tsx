"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { navClienteVisivel, rotaAtiva } from "@/lib/nav";
import { Logo } from "@/components/Logo";
import { AdminSecretLogo } from "@/components/AdminSecretLogo";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

/* ─────────────────────────────────────────────────────────────
   Glassmorphism layers (collapsed state):

   1. Body gradient: navy translúcido, mais claro no topo
   2. Diagonal glare: fonte de luz 135° — simula reflexo na superfície
   3. Specular top: brilho radial no canto superior esquerdo
   4. Edge highlight: borda interna branca (inset shadow) = vidro iluminado
   5. Bottom vignette: escurece base = profundidade
   6. backdrop-blur: desfoca conteúdo atrás do painel
───────────────────────────────────────────────────────────── */

/*
  Glass retraída: fundo 100% transparente.
  O backdrop-blur desfoca o background do app (cool-white) criando
  o efeito de vidro fosco sem adicionar cor própria.
  Camadas decorativas apenas: glare diagonal + shimmer de borda.
*/
const GLASS_STYLE: React.CSSProperties = {
  background: [
    /* glare diagonal — reflexo de fonte de luz, muito sutil */
    "linear-gradient(135deg, oklch(0.60 0.005 258 / 0.07) 0%, transparent 55%)",
    /* tint base: quase nulo, só para não ser pure void */
    "linear-gradient(180deg, oklch(0.97 0.002 258 / 0.06) 0%, oklch(0.97 0.002 258 / 0.04) 100%)",
  ].join(", "),
  backdropFilter: "blur(22px) saturate(1.05)",
  WebkitBackdropFilter: "blur(22px) saturate(1.05)",
  borderRight: "1px solid oklch(0.232 0.006 265 / 0.14)",
  boxShadow: "2px 0 16px oklch(0.20 0.006 255 / 0.08)",
};

const SOLID_STYLE: React.CSSProperties = {
  background: "var(--sidebar)",
  borderRight: "1px solid var(--sidebar-border)",
  boxShadow: "none",
  backdropFilter: "none",
  WebkitBackdropFilter: "none",
};

export function SidebarNav({ galeriaVisivel = true }: { galeriaVisivel?: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const itens = navClienteVisivel(galeriaVisivel);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 240 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      style={collapsed ? GLASS_STYLE : SOLID_STYLE}
      className="hidden md:flex relative shrink-0 flex-col overflow-hidden"
    >
      {/* ── Glass overlays — visíveis só no colapso ──────────── */}
      <AnimatePresence>
        {collapsed && (
          <motion.div
            key="glass-layers"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute inset-0 z-0"
          >
            {/* Glare radial navy — canto superior */}
            <div
              className="absolute -top-8 -left-8 w-32 h-32 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, oklch(0.55 0.006 258 / 0.12) 0%, transparent 65%)",
              }}
            />
            {/* Borda superior: shimmer navy claro */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, oklch(0.60 0.006 258 / 0.28) 50%, transparent 100%)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gradient overlay — expandido: shimmer sutil no topo */}
      {!collapsed && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "linear-gradient(180deg, oklch(1 0 0 / 0.03) 0%, transparent 35%)",
          }}
        />
      )}

      {/* Right edge glow */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-px z-0 bg-gradient-to-b from-transparent via-sidebar-primary/20 to-transparent" />

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex h-[72px] shrink-0 items-center justify-between px-3">
        <AdminSecretLogo className="flex shrink-0 items-center gap-3 leading-none overflow-hidden">
          {/* Logo — inline-flex garante rounded-full no box-shadow */}
          <span
            className="shrink-0 inline-flex rounded-full"
            style={{
              boxShadow: collapsed
                ? "0 0 0 1.5px oklch(0.232 0.006 265 / 0.30), 0 0 14px oklch(0.232 0.006 265 / 0.12)"
                : "0 0 0 1.5px oklch(0.780 0.004 258 / 0.30), 0 0 12px oklch(0.780 0.004 258 / 0.10)",
              transition: "box-shadow 0.3s ease",
            }}
          >
            <Logo className="size-11 rounded-full" />
          </span>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col overflow-hidden"
              >
                <span className="font-heading text-[17px] font-bold tracking-tight text-sidebar-foreground whitespace-nowrap">
                  Biel Barber
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-sidebar-foreground/45">
                  Shop
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </AdminSecretLogo>

        {/* Toggle — sempre visível, muda só o ícone */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex shrink-0 items-center justify-center size-7 rounded-lg transition-all hover:scale-110 active:scale-95",
            collapsed
              ? "text-primary/50 hover:text-primary hover:bg-primary/10"
              : "text-sidebar-foreground/35 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          )}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          <motion.div
            animate={{ rotate: collapsed ? 0 : 180 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          >
            <ChevronRight className="size-3.5" />
          </motion.div>
        </button>
      </div>

      {/* Divider */}
      <div
        className="relative z-10 mx-3 h-px"
        style={{
          background: collapsed
            ? "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.15), transparent)"
            : "linear-gradient(90deg, transparent, var(--sidebar-border), transparent)",
        }}
      />

      {/* ── Nav items ──────────────────────────────────────────── */}
      <nav className="relative z-10 flex flex-1 flex-col gap-0.5 px-2 py-3">
        {itens.map((item) => {
          const Icone = item.icone;
          const ativo = rotaAtiva(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.rotulo : undefined}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl text-sm font-medium",
                "transition-all duration-200",
                collapsed ? "justify-center px-0 py-3" : "px-3 py-2.5",
                ativo
                  ? "text-sidebar-primary-foreground"
                  : collapsed
                  ? "text-primary/55 hover:text-primary/90"
                  : "text-sidebar-foreground/55 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              {/* Active bg pill */}
              {ativo && (
                <motion.div
                  layoutId="nav-active-pill"
                  className="absolute inset-0 rounded-xl bg-sidebar-primary"
                  style={{
                    boxShadow:
                      "0 0 18px oklch(0.780 0.004 258 / 0.30), 0 2px 8px oklch(0.16 0.004 258 / 0.5)",
                  }}
                  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                />
              )}

              {/* Hover pill (collapsed) — navy translúcido */}
              {collapsed && !ativo && (
                <span
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{
                    background: "oklch(0.232 0.006 265 / 0.07)",
                    border: "1px solid oklch(0.232 0.006 265 / 0.11)",
                  }}
                />
              )}

              <Icone
                className={cn(
                  "relative shrink-0 size-[19px] transition-transform duration-200",
                  ativo
                    ? "drop-shadow-[0_0_7px_oklch(0.780_0.004_258/0.9)]"
                    : "group-hover:scale-110"
                )}
                strokeWidth={ativo ? 2.5 : 2}
                aria-hidden="true"
              />

              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.16 }}
                    className="relative whitespace-nowrap overflow-hidden"
                  >
                    {item.rotulo}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div
        className="relative z-10 mx-3 h-px"
        style={{
          background: collapsed
            ? "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.12), transparent)"
            : "linear-gradient(90deg, transparent, var(--sidebar-border), transparent)",
        }}
      />

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "relative z-10 flex items-center gap-2 py-4 text-xs",
          collapsed
            ? "justify-center px-2 text-primary/30"
            : "px-4 text-sidebar-foreground/30"
        )}
      >
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              Av. Serrinha, 82 · Vale do Jatobá
            </motion.span>
          )}
        </AnimatePresence>

        <ThemeToggle
          className={
            collapsed
              ? "text-primary/50 hover:text-primary hover:bg-primary/10"
              : "ml-auto text-sidebar-foreground/40 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          }
        />
      </div>
    </motion.aside>
  );
}
