import { QueryProvider } from "@/components/QueryProvider";
import { SidebarNav } from "@/components/SidebarNav";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";

export default function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <div className="flex min-h-[100dvh] w-full">
        {/* Desktop: navegação lateral */}
        <SidebarNav />

        {/* Coluna principal */}
        <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
          {/* Mobile: barra superior */}
          <TopBar />

          <main className="flex-1 overflow-x-hidden">{children}</main>

          {/* Mobile: navegação inferior */}
          <BottomNav />
        </div>
      </div>
    </QueryProvider>
  );
}
