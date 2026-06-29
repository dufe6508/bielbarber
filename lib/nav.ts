import {
  CalendarCheck,
  ShoppingBag,
  Crown,
  CalendarDays,
  BadgeCheck,
  Images,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ItemNav = {
  href: string;
  rotulo: string;
  icone: LucideIcon;
};

// Navegação do cliente — compartilhada entre sidebar (desktop) e bottom nav (mobile)
export const navCliente: ItemNav[] = [
  { href: "/", rotulo: "Agendar", icone: CalendarCheck },
  { href: "/galeria", rotulo: "Galeria", icone: Images },
  { href: "/loja", rotulo: "Loja", icone: ShoppingBag },
  { href: "/pacotes", rotulo: "Assinaturas", icone: Crown },
  { href: "/mensalista", rotulo: "Mensalista", icone: BadgeCheck },
  { href: "/meus-agendamentos", rotulo: "Agendamentos", icone: CalendarDays },
];

export function rotaAtiva(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// Nav do cliente respeitando a visibilidade da galeria (config do admin).
export function navClienteVisivel(galeriaVisivel: boolean): ItemNav[] {
  return galeriaVisivel
    ? navCliente
    : navCliente.filter((i) => i.href !== "/galeria");
}
