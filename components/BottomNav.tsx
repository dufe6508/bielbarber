"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navClienteVisivel, rotaAtiva } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

// Spring compartilhado — dá o "peso" físico ao movimento (pílula, ícone, rótulo)
const spring = { type: "spring" as const, stiffness: 380, damping: 30, mass: 0.8 };

export function BottomNav({ galeriaVisivel = true }: { galeriaVisivel?: boolean }) {
  const pathname = usePathname();
  const itens = navClienteVisivel(galeriaVisivel);

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "border-t border-border/40 bg-background/80 backdrop-blur-2xl",
        "pb-[env(safe-area-inset-bottom)]"
      )}
      style={{
        boxShadow:
          "0 -1px 0 oklch(0.872 0.003 258 / 0.5), 0 -10px 30px oklch(0.20 0.006 255 / 0.08)",
      }}
    >
      <div className="flex items-stretch px-1">
        {itens.map((item) => {
          const Icone = item.icone;
          const ativo = rotaAtiva(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className="group relative flex flex-1 flex-col items-center pt-2 pb-1.5 outline-none"
            >
              {/* Barra superior — desliza entre abas com spring */}
              {ativo && (
                <motion.div
                  layoutId="bottom-nav-bar"
                  className="absolute top-0 left-1/2 h-[2.5px] w-9 -translate-x-1/2 rounded-full bg-primary"
                  style={{ boxShadow: "0 0 10px oklch(0.232 0.006 265 / 0.7)" }}
                  transition={spring}
                />
              )}

              {/* Ícone + pílula — escala no toque (whileTap) */}
              <motion.span
                className="relative flex h-9 w-14 items-center justify-center"
                whileTap={{ scale: 0.82 }}
                transition={{ type: "spring", stiffness: 600, damping: 20 }}
              >
                {/* Pílula de fundo — desliza para a aba ativa */}
                {ativo && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute inset-0 rounded-2xl bg-primary/10"
                    transition={spring}
                  />
                )}

                {/* Pop do ícone ao ativar */}
                <motion.span
                  className="relative"
                  animate={{
                    scale: ativo ? 1.12 : 1,
                    y: ativo ? -1 : 0,
                  }}
                  transition={spring}
                >
                  <Icone
                    className={cn(
                      "size-[22px] transition-colors duration-200",
                      ativo
                        ? "text-primary drop-shadow-[0_0_7px_oklch(0.232_0.006_265/0.5)]"
                        : "text-muted-foreground group-active:text-foreground"
                    )}
                    strokeWidth={ativo ? 2.5 : 2}
                    aria-hidden="true"
                  />
                </motion.span>
              </motion.span>

              {/* Rótulo — sobe e ganha peso quando ativo */}
              <motion.span
                className={cn(
                  "text-[10px] font-medium leading-none tracking-tight",
                  ativo ? "text-primary" : "text-muted-foreground"
                )}
                animate={{
                  opacity: ativo ? 1 : 0.7,
                  y: ativo ? -1 : 0,
                  fontWeight: ativo ? 600 : 500,
                }}
                transition={spring}
              >
                {item.rotulo}
              </motion.span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
