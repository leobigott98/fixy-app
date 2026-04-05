import type { Route } from "next";
import {
  CalendarClock,
  CalendarDays,
  CarFront,
  ClipboardList,
  Coins,
  ContactRound,
  FileBarChart2,
  Gauge,
  Bell,
  ShoppingCart,
  Star,
  Settings,
  Truck,
  UsersRound,
  Wrench,
  Search,
  UserRound,
} from "lucide-react";

import { hasModuleAccess, type AppModuleKey, type AppRole } from "@/lib/permissions";

type NavigationItem = {
  title: string;
  href: Route;
  icon: typeof Gauge;
  moduleKey: AppModuleKey;
};

const allNavigation: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/app/dashboard" as Route,
    icon: Gauge,
    moduleKey: "dashboard",
  },
  {
    title: "Clientes",
    href: "/app/clients" as Route,
    icon: ContactRound,
    moduleKey: "clients",
  },
  {
    title: "Vehiculos",
    href: "/app/vehicles" as Route,
    icon: CarFront,
    moduleKey: "vehicles",
  },
  {
    title: "Presupuestos",
    href: "/app/quotes" as Route,
    icon: ClipboardList,
    moduleKey: "quotes",
  },
  {
    title: "Ordenes",
    href: "/app/work-orders" as Route,
    icon: Wrench,
    moduleKey: "work_orders",
  },
  {
    title: "Equipo",
    href: "/app/mechanics" as Route,
    icon: UsersRound,
    moduleKey: "mechanics",
  },
  {
    title: "Calendario",
    href: "/app/calendar" as Route,
    icon: CalendarDays,
    moduleKey: "calendar",
  },
  {
    title: "Inventario",
    href: "/app/inventory" as Route,
    icon: ClipboardList,
    moduleKey: "inventory",
  },
  {
    title: "Finanzas",
    href: "/app/finances" as Route,
    icon: Coins,
    moduleKey: "finances",
  },
  {
    title: "Proveedores",
    href: "/app/suppliers" as Route,
    icon: Truck,
    moduleKey: "suppliers",
  },
  {
    title: "Compras",
    href: "/app/purchase-orders" as Route,
    icon: ShoppingCart,
    moduleKey: "purchase_orders",
  },
  {
    title: "Reportes",
    href: "/app/reports" as Route,
    icon: FileBarChart2,
    moduleKey: "reports",
  },
  {
    title: "Solicitudes",
    href: "/app/notifications" as Route,
    icon: Bell,
    moduleKey: "notifications",
  },
  {
    title: "Resenas",
    href: "/app/reviews" as Route,
    icon: Star,
    moduleKey: "reviews",
  },
  {
    title: "Ajustes",
    href: "/app/settings" as Route,
    icon: Settings,
    moduleKey: "settings",
  },
  {
    title: "Mi garage",
    href: "/app/garage" as Route,
    icon: Gauge,
    moduleKey: "owner_garage",
  },
  {
    title: "Mis carros",
    href: "/app/my-cars" as Route,
    icon: CarFront,
    moduleKey: "owner_vehicles",
  },
  {
    title: "Talleres",
    href: "/app/workshops" as Route,
    icon: Search,
    moduleKey: "owner_marketplace",
  },
  {
    title: "Citas",
    href: "/app/appointments" as Route,
    icon: CalendarClock,
    moduleKey: "owner_appointments",
  },
  {
    title: "Historial",
    href: "/app/history" as Route,
    icon: ClipboardList,
    moduleKey: "owner_history",
  },
  {
    title: "Perfil",
    href: "/app/profile" as Route,
    icon: UserRound,
    moduleKey: "owner_profile",
  },
] as const;

export function getPrimaryNavigation(role: AppRole) {
  return allNavigation.filter((item) => hasModuleAccess(role, item.moduleKey));
}

export function getMobileNavigation(role: AppRole) {
  const preferredModules: AppModuleKey[] =
    role === "car_owner"
      ? [
          "owner_garage",
          "owner_vehicles",
          "owner_marketplace",
          "owner_appointments",
          "owner_profile",
        ]
      : role === "mechanic"
      ? ["dashboard", "work_orders", "calendar"]
      : role === "jefe_taller"
        ? ["dashboard", "mechanics", "work_orders", "calendar"]
        : role === "recepcion"
          ? ["dashboard", "notifications", "quotes", "calendar", "work_orders"]
          : role === "finanzas"
            ? ["dashboard", "finances", "reports", "inventory", "notifications"]
            : ["dashboard", "clients", "quotes", "work_orders", "notifications"];

  return preferredModules
    .map((moduleKey) => allNavigation.find((item) => item.moduleKey === moduleKey))
    .filter((item): item is NavigationItem => Boolean(item))
    .filter((item) => hasModuleAccess(role, item.moduleKey));
}
