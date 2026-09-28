import {
  Briefcase,
  CalendarDays,
  CheckSquare,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/** Cookie que recuerda si la sidebar está contraída (se lee en el servidor). */
export const SIDEBAR_COOKIE = "mf_sidebar_collapsed";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Palabras extra para el buscador Ctrl+K. */
  keywords?: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "General",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, keywords: ["inicio", "resumen", "kpi"] },
      { href: "/tareas", label: "Tareas", icon: CheckSquare, keywords: ["kanban", "mi día", "pendientes"] },
      { href: "/reuniones", label: "Reuniones", icon: Video, keywords: ["meet", "agenda", "llamadas"] },
      { href: "/calendario", label: "Calendario", icon: CalendarDays, keywords: ["fechas", "agenda", "mes"] },
    ],
  },
  {
    label: "Comercial",
    items: [
      { href: "/clientes", label: "Clientes", icon: Users, keywords: ["crm", "prospectos"] },
      { href: "/proyectos", label: "Proyectos", icon: Briefcase, keywords: ["entregas", "avance"] },
      { href: "/cotizaciones", label: "Cotizaciones", icon: FileText, keywords: ["propuestas", "pdf", "precios"] },
    ],
  },
  {
    label: "Dinero",
    items: [
      { href: "/finanzas", label: "Finanzas", icon: Wallet, keywords: ["gastos", "ingresos", "cobros", "p&l"] },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = {
  href: "/ajustes",
  label: "Ajustes",
  icon: Settings,
  keywords: ["perfil", "marca", "categorías", "color"],
};

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM];

/** Ítems fijos del menú inferior en el celular (el resto va en "Más"). */
export const MOBILE_PRIMARY = ["/dashboard", "/tareas", "/calendario", "/finanzas"];

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function findNavItem(pathname: string) {
  return ALL_NAV_ITEMS.find((item) => isActivePath(pathname, item.href));
}
