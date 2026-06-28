import { AdminPage, AdminHeader } from "@/components/admin/primitives";
import { MensalistasManager } from "@/components/admin/mensalistas/MensalistasManager";

export default function MensalistasPage() {
  return (
    <AdminPage>
      <AdminHeader
        titulo="Mensalistas"
        descricao="Pós-pago: o cliente corta no mês e paga no fechamento (dia 10 ou 30). Marque pago para fechar o ciclo."
      />
      <MensalistasManager />
    </AdminPage>
  );
}
