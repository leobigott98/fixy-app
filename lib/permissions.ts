import type { Route } from "next";

export const workshopRoleOptions = [
  { value: "owner", label: "Propietario" },
  { value: "admin", label: "Admin" },
  { value: "jefe_taller", label: "Jefe de taller" },
  { value: "recepcion", label: "Recepcion" },
  { value: "finanzas", label: "Finanzas" },
  { value: "mechanic", label: "Mecanico" },
] as const;

export type WorkshopRole = (typeof workshopRoleOptions)[number]["value"];

export const staffInviteRoleOptions = workshopRoleOptions.filter(
  (option) => option.value !== "owner" && option.value !== "admin",
);

export const appModuleOptions = [
  "dashboard",
  "clients",
  "vehicles",
  "quotes",
  "work_orders",
  "mechanics",
  "calendar",
  "inventory",
  "finances",
  "suppliers",
  "purchase_orders",
  "reports",
  "notifications",
  "reviews",
  "settings",
] as const;

export type AppModuleKey = (typeof appModuleOptions)[number];

export const permissionOptions = [
  "manage_workshop",
  "manage_suppliers",
  "manage_purchase_orders",
  "view_reports",
] as const;

export type AppPermission = (typeof permissionOptions)[number];

const roleModules: Record<WorkshopRole, AppModuleKey[]> = {
  owner: [...appModuleOptions],
  admin: [...appModuleOptions],
  jefe_taller: ["dashboard", "vehicles", "work_orders", "mechanics", "calendar"],
  recepcion: [
    "dashboard",
    "clients",
    "vehicles",
    "quotes",
    "work_orders",
    "calendar",
    "notifications",
    "reviews",
  ],
  finanzas: [
    "dashboard",
    "clients",
    "vehicles",
    "quotes",
    "work_orders",
    "calendar",
    "inventory",
    "finances",
    "suppliers",
    "purchase_orders",
    "reports",
    "notifications",
    "reviews",
  ],
  mechanic: ["dashboard", "work_orders", "calendar"],
};

const rolePermissions: Record<WorkshopRole, AppPermission[]> = {
  owner: ["manage_workshop", "manage_suppliers", "manage_purchase_orders", "view_reports"],
  admin: ["manage_workshop", "manage_suppliers", "manage_purchase_orders", "view_reports"],
  jefe_taller: [],
  recepcion: [],
  finanzas: ["manage_suppliers", "manage_purchase_orders", "view_reports"],
  mechanic: [],
};

export function getRoleLabel(role: WorkshopRole | string) {
  return workshopRoleOptions.find((option) => option.value === role)?.label ?? role;
}

export function hasModuleAccess(role: WorkshopRole, moduleKey: AppModuleKey) {
  return roleModules[role].includes(moduleKey);
}

export function getRoleModules(role: WorkshopRole) {
  return roleModules[role];
}

export function hasPermission(role: WorkshopRole, permission: AppPermission) {
  return rolePermissions[role].includes(permission);
}

export function getRolePermissions(role: WorkshopRole) {
  return rolePermissions[role];
}

export function getRoleHomePath(role: WorkshopRole) {
  switch (role) {
    case "mechanic":
      return "/app/work-orders" as Route;
    case "jefe_taller":
      return "/app/mechanics" as Route;
    case "recepcion":
      return "/app/notifications" as Route;
    case "finanzas":
      return "/app/finances" as Route;
    default:
      return "/app/dashboard" as Route;
  }
}
