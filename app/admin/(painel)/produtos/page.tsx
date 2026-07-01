"use client";

import { useState } from "react";
import { ShoppingBag, ShoppingCart } from "lucide-react";
import { AdminPage, AdminHeader } from "@/components/admin/primitives";
import { ProdutosManager } from "@/components/admin/produtos/ProdutosManager";
import { PedidosTab } from "@/components/admin/produtos/PedidosTab";
import { cn } from "@/lib/utils";

const ABAS = [
  { id: "produtos", rotulo: "Produtos", icone: ShoppingBag },
  { id: "pedidos", rotulo: "Pedidos", icone: ShoppingCart },
] as const;

type Aba = typeof ABAS[number]["id"];

export default function LojaAdminPage() {
  const [aba, setAba] = useState<Aba>("produtos");

  return (
    <AdminPage>
      <AdminHeader
        titulo="Loja"
        descricao="Produtos, estoque, promoções e pedidos dos clientes."
      />

      {/* Seletor de aba */}
      <div className="mb-6 flex gap-1 rounded-xl border border-border bg-muted/40 p-1">
        {ABAS.map(({ id, rotulo, icone: Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              aba === id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {rotulo}
          </button>
        ))}
      </div>

      {aba === "produtos" && <ProdutosManager />}
      {aba === "pedidos" && <PedidosTab />}
    </AdminPage>
  );
}
