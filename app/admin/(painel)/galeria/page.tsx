import { AdminPage, AdminHeader } from "@/components/admin/primitives";
import { GaleriaManager } from "@/components/admin/galeria/GaleriaManager";
import { GaleriaVisibilidadeToggle } from "@/components/admin/galeria/GaleriaVisibilidadeToggle";

export default function GaleriaAdminPage() {
  return (
    <AdminPage>
      <AdminHeader
        titulo="Galeria"
        descricao="Portfólio visual de cortes. Crie categorias, suba fotos e vincule um serviço — ao tocar em 'Agendar', o cliente já leva esse serviço no carrinho."
        acao={<GaleriaVisibilidadeToggle />}
      />
      <GaleriaManager />
    </AdminPage>
  );
}
