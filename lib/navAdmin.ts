import {
  LayoutDashboard,
  CalendarDays,
  Scissors,
  ShoppingBag,
  ShoppingCart,
  Crown,
  BadgeCheck,
  Users,
  Wallet,
  Images,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ItemNavAdmin = {
  href: string;
  rotulo: string;
  icone: LucideIcon;
};

// Navegação do painel admin. Espelha as áreas do cliente + controle.
export const navAdmin: ItemNavAdmin[] = [
  { href: "/admin", rotulo: "Visão geral", icone: LayoutDashboard },
  { href: "/admin/agenda", rotulo: "Agenda", icone: CalendarDays },
  { href: "/admin/agendamentos", rotulo: "Agendamentos", icone: BadgeCheck },
  { href: "/admin/clientes", rotulo: "Clientes", icone: Users },
  { href: "/admin/servicos", rotulo: "Serviços", icone: Scissors },
  { href: "/admin/produtos", rotulo: "Loja", icone: ShoppingBag },
  { href: "/admin/pedidos", rotulo: "Pedidos", icone: ShoppingCart },
  { href: "/admin/galeria", rotulo: "Galeria", icone: Images },
  { href: "/admin/pacotes", rotulo: "Assinaturas", icone: Crown },
  { href: "/admin/mensalistas", rotulo: "Mensalistas", icone: Users },
  { href: "/admin/financeiro", rotulo: "Financeiro", icone: Wallet },
  { href: "/admin/configuracoes", rotulo: "Configurações", icone: Settings },
];

export function rotaAtivaAdmin(pathname: string, href: string): boolean {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname.startsWith(href);
}
