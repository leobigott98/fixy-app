import {
  CalendarDays,
  CarFront,
  ClipboardList,
  Coins,
  ContactRound,
  Gauge,
  Settings,
  UsersRound,
  Wrench,
} from "lucide-react";

export const primaryNavigation = [
  {
    title: "Dashboard",
    href: "/app/dashboard",
    icon: Gauge,
  },
  {
    title: "Clientes",
    href: "/app/clients",
    icon: ContactRound,
  },
  {
    title: "Vehiculos",
    href: "/app/vehicles",
    icon: CarFront,
  },
  {
    title: "Presupuestos",
    href: "/app/quotes",
    icon: ClipboardList,
  },
  {
    title: "Ordenes",
    href: "/app/work-orders",
    icon: Wrench,
  },
  {
    title: "Equipo",
    href: "/app/mechanics",
    icon: UsersRound,
  },
  {
    title: "Calendario",
    href: "/app/calendar",
    icon: CalendarDays,
  },
  {
    title: "Inventario",
    href: "/app/inventory",
    icon: ClipboardList,
  },
  {
    title: "Finanzas",
    href: "/app/finances",
    icon: Coins,
  },
  {
    title: "Ajustes",
    href: "/app/settings",
    icon: Settings,
  },
] as const;

export const mobileNavigation = [
  primaryNavigation[0],
  primaryNavigation[1],
  primaryNavigation[3],
  primaryNavigation[4],
  primaryNavigation[9],
] as const;
