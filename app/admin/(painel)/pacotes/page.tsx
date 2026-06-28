import { AdminPage, AdminHeader } from "@/components/admin/primitives";
import { PacotesManager } from "@/components/admin/pacotes/PacotesManager";

export default function PacotesAdminPage() {
  return (
    <AdminPage>
      <AdminHeader
        titulo="Assinaturas"
        descricao="Planos e combos. Quantidade por mês, limite semanal, serviços inclusos e renovação."
      />
      <PacotesManager />
    </AdminPage>
  );
}
