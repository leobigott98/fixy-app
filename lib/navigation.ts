import type { Route } from "next";
import {
  CalendarDays,
  CarFront,
  ClipboardList,
  Coins,
  ContactRound,
  FileBarChart2,
  Gauge,
  Bell,
  ShoppingCart,
  Settings,
  Truck,
  UsersRound,
  Wrench,
} from "lucide-react";

export const primaryNavigation = [
  {
    title: "Dashboard",
    href: "/app/dashboard" as Route,
    icon: Gauge,
  },
  {
    title: "Clientes",
    href: "/app/clients" as Route,
    icon: ContactRound,
  },
  {
    title: "Vehiculos",
    href: "/app/vehicles" as Route,
    icon: CarFront,
  },
  {
    title: "Presupuestos",
    href: "/app/quotes" as Route,
    icon: ClipboardList,
  },
  {
    title: "Ordenes",
    href: "/app/work-orders" as Route,
    icon: Wrench,
  },
  {
    title: "Equipo",
    href: "/app/mechanics" as Route,
    icon: UsersRound,
  },
  {
    title: "Calendario",
    href: "/app/calendar" as Route,
    icon: CalendarDays,
  },
  {
    title: "Inventario",
    href: "/app/inventory" as Route,
    icon: ClipboardList,
  },
  {
    title: "Finanzas",
    href: "/app/finances" as Route,
    icon: Coins,
  },
  {
    title: "Proveedores",
    href: "/app/suppliers" as Route,
    icon: Truck,
  },
  {
    title: "Compras",
    href: "/app/purchase-orders" as Route,
    icon: ShoppingCart,
  },
  {
    title: "Reportes",
    href: "/app/reports" as Route,
    icon: FileBarChart2,
  },
  {
    title: "Solicitudes",
    href: "/app/notifications" as Route,
    icon: Bell,
  },
  {
    title: "Ajustes",
    href: "/app/settings" as Route,
    icon: Settings,
  },
] as const;

export const mobileNavigation = [
  primaryNavigation[0],
  primaryNavigation[1],
  primaryNavigation[3],
  primaryNavigation[4],
  primaryNavigation[12],
] as const;
