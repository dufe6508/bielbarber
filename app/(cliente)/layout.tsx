import { QueryProvider } from "@/components/QueryProvider";
import { SidebarNav } from "@/components/SidebarNav";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { getGaleriaVisivel } from "@/lib/utils/slots";

export default async function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const galeriaVisivel = await getGaleriaVisivel();
  return (
    <QueryProvider>
      <div className="flex min-h-[100dvh] w-full">
        {/* Desktop: navegação lateral */}
        <SidebarNav galeriaVisivel={galeriaVisivel} />

        {/* Coluna principal */}
        <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
          {/* Mobile: barra superior */}
          <TopBar />

          <main className="relative flex-1 overflow-x-hidden pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
            {/* Sino + tema — desktop only, fixo no canto superior direito */}
            <div className="fixed top-4 right-4 z-40 hidden items-center gap-1.5 md:flex">
              <NotificationCenter
                audiencia="cliente"
                className="size-10 rounded-xl border border-border bg-card shadow-md hover:bg-accent"
              />
              <ThemeToggle className="size-10 rounded-xl border border-border bg-card text-muted-foreground shadow-md hover:text-foreground hover:bg-accent" />
            </div>
            {children}
          </main>

          {/* Mobile: navegação inferior */}
          <BottomNav galeriaVisivel={galeriaVisivel} />
        </div>
      </div>
    </QueryProvider>
  );
}
