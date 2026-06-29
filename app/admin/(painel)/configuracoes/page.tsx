import { AdminPage, AdminHeader } from "@/components/admin/primitives";
import { ConfigManager } from "@/components/admin/config/ConfigManager";

export default function ConfiguracoesPage() {
  return (
    <AdminPage className="max-w-2xl">
      <AdminHeader
        titulo="Configurações"
        descricao="Dados da barbearia, logo e segurança da conta."
      />
      <ConfigManager />
    </AdminPage>
  );
}
