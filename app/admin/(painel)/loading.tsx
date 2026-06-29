import { Loader2 } from "lucide-react";
import { AdminPage, AdminHeader } from "@/components/admin/primitives";

export default function AdminLoading() {
  return (
    <AdminPage>
      <AdminHeader
        titulo="Carregando..."
        descricao="Aguarde enquanto os dados são recuperados."
      />
      <div className="mt-8 flex min-h-[40vh] items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span className="text-sm">Buscando informações do painel...</span>
        </div>
      </div>
    </AdminPage>
  );
}
