import { AdminPage, AdminHeader } from "@/components/admin/primitives";
import { ProdutosManager } from "@/components/admin/produtos/ProdutosManager";

export default function ProdutosAdminPage() {
  return (
    <AdminPage>
      <AdminHeader
        titulo="Loja"
        descricao="Produtos, estoque, promoções e destaques. O que estiver ativo aparece na vitrine do cliente."
      />
      <ProdutosManager />
    </AdminPage>
  );
}
