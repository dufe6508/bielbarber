import { Suspense } from "react";
import { AdminPage, AdminHeader } from "@/components/admin/primitives";
import { AgendamentosView } from "@/components/admin/agendamentos/AgendamentosView";

export default function AgendamentosPage() {
  return (
    <AdminPage>
      <AdminHeader
        titulo="Agendamentos"
        descricao="Veja o seu dia hora a hora ou a lista completa, com presença e pagamento."
      />
      <Suspense fallback={null}>
        <AgendamentosView />
      </Suspense>
    </AdminPage>
  );
}
