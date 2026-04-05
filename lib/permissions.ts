export const workshopRoleOptions = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "mechanic", label: "Mecanico" },
] as const;

export type WorkshopRole = (typeof workshopRoleOptions)[number]["value"];

export const permissionOptions = [
  "manage_workshop",
  "manage_suppliers",
  "manage_purchase_orders",
  "view_reports",
] as const;

export type AppPermission = (typeof permissionOptions)[number];

const rolePermissions: Record<WorkshopRole, AppPermission[]> = {
  owner: ["manage_workshop", "manage_suppliers", "manage_purchase_orders", "view_reports"],
  admin: ["manage_suppliers", "manage_purchase_orders", "view_reports"],
  mechanic: [],
};

export function getRoleLabel(role: WorkshopRole | string) {
  return workshopRoleOptions.find((option) => option.value === role)?.label ?? role;
}

export function hasPermission(role: WorkshopRole, permission: AppPermission) {
  return rolePermissions[role].includes(permission);
}

export function getRolePermissions(role: WorkshopRole) {
  return rolePermissions[role];
}
