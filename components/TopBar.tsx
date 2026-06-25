import Link from "next/link";
import { Logo } from "@/components/Logo";

// Barra superior — só no mobile (md:hidden). No desktop a SidebarNav assume.
export function TopBar() {
  return (
    <header className="shrink-0 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:hidden">
      <div className="flex h-14 items-center justify-center px-5">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <Logo className="size-8 shrink-0 rounded-full text-sm ring-2 ring-primary/60" />
          <span className="inline-flex items-baseline gap-1.5">
            <span className="font-heading text-lg font-bold tracking-tight text-foreground">
              Biel Barber
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Shop
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
}
