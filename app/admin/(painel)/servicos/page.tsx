import { AdminPage, AdminHeader } from "@/components/admin/primitives";
import { ServicosManager } from "@/components/admin/servicos/ServicosManager";

export default function ServicosAdminPage() {
  return (
    <AdminPage>
      <AdminHeader
        titulo="Serviços"
        descricao="Preço, duração, slots ocupados e quantos clientes cabem no mesmo horário."
      />
      <ServicosManager />
    </AdminPage>
  );
}
