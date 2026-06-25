"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navCliente, rotaAtiva } from "@/lib/nav";
import { cn } from "@/lib/utils";

// Navegação inferior — só no mobile (md:hidden)
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="shrink-0 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/75 md:hidden">
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
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                ativo ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  ativo && "bg-accent"
                )}
              >
                <Icone className="size-5" strokeWidth={ativo ? 2.4 : 2} />
              </span>
              {item.rotulo}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
