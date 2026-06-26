import {
  CalendarCheck,
  ShoppingBag,
  Crown,
  CalendarDays,
  BadgeCheck,
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
  { href: "/loja", rotulo: "Loja", icone: ShoppingBag },
  { href: "/pacotes", rotulo: "Assinaturas", icone: Crown },
  { href: "/mensalista", rotulo: "Mensalista", icone: BadgeCheck },
  { href: "/meus-agendamentos", rotulo: "Agendamentos", icone: CalendarDays },
];

export function rotaAtiva(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
