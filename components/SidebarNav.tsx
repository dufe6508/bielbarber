"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin } from "lucide-react";
import { navCliente, rotaAtiva } from "@/lib/nav";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

// Navegação lateral — visível só no desktop (md+)
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      {/* Marca */}
      <div className="px-6 pb-2 pt-7">
        <Link href="/" className="inline-flex items-center gap-3 leading-none">
          <Logo className="size-11 shrink-0 rounded-full text-lg ring-2 ring-sidebar-primary/70 ring-offset-2 ring-offset-sidebar" />
          <span className="flex flex-col">
            <span className="font-heading text-xl font-bold tracking-tight text-sidebar-foreground">
              Biel Barber
            </span>
            <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.25em] text-sidebar-foreground/50">
              Shop
            </span>
          </span>
        </Link>
      </div>

      {/* Itens */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-6">
        {navCliente.map((item) => {
          const Icone = item.icone;
          const ativo = rotaAtiva(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                ativo
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icone
                className="size-[18px]"
                strokeWidth={ativo ? 2.4 : 2}
              />
              {item.rotulo}
            </Link>
          );
        })}
      </nav>

      {/* Rodapé — localização */}
      <div className="border-t border-sidebar-border px-6 py-5">
        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/55">
          <MapPin className="size-3.5" />
          <span>Vale do Jatobá, BH</span>
        </div>
      </div>
    </aside>
  );
}
