import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AdminSecretLogo } from "@/components/AdminSecretLogo";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

// Barra superior — só no mobile (md:hidden). No desktop a SidebarNav assume.
export function TopBar() {
  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex h-14 items-center px-5">
        <AdminSecretLogo className="inline-flex items-center gap-2.5">
          <span
            className="inline-flex shrink-0 rounded-full ring-1 ring-primary/25"
            style={{ boxShadow: "0 0 0 3px oklch(0.232 0.006 265 / 0.05)" }}
          >
            <Logo className="size-8 rounded-full text-sm" />
          </span>
          <span className="inline-flex items-baseline gap-1.5">
            <span className="font-heading text-lg font-semibold tracking-[-0.01em] text-foreground">
              Biel Barber
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
              Shop
            </span>
          </span>
        </AdminSecretLogo>
        <div className="ml-auto flex items-center gap-0.5">
          <NotificationCenter audiencia="cliente" />
          <ThemeToggle className="text-muted-foreground hover:bg-muted hover:text-foreground" />
        </div>
      </div>
    </header>
  );
}
