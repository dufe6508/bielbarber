"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navCliente, rotaAtiva } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "border-t border-border/40 bg-background/85 backdrop-blur-xl",
        "pb-[env(safe-area-inset-bottom)]"
      )}
      style={{
        boxShadow: "0 -1px 0 oklch(0.872 0.003 258 / 0.5), 0 -8px 24px oklch(0.20 0.006 255 / 0.07)",
      }}
    >
      <div className="flex items-stretch">
        {navCliente.map((item) => {
          const Icone = item.icone;
          const ativo = rotaAtiva(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                ativo ? "text-primary" : "text-muted-foreground"
              )}
            >
              {/* Top indicator bar */}
              {ativo && (
                <motion.div
                  layoutId="bottom-nav-bar"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full bg-primary"
                  style={{
                    boxShadow: "0 0 8px oklch(0.232 0.006 265 / 0.6)",
                  }}
                  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                />
              )}

              {/* Icon pill */}
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-xl transition-all duration-200",
                  ativo ? "bg-primary/10" : "group-hover:bg-muted"
                )}
              >
                <Icone
                  className={cn(
                    "size-5 transition-transform duration-200",
                    ativo && "drop-shadow-[0_0_6px_oklch(0.232_0.006_265/0.5)] scale-105"
                  )}
                  strokeWidth={ativo ? 2.5 : 2}
                  aria-hidden="true"
                />
              </span>

              {item.rotulo}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
