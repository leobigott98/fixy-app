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
export type AppRole = WorkshopRole | "car_owner";

export const staffInviteRoleOptions = workshopRoleOptions.filter(
  (option) => option.value !== "owner" && option.value !== "admin",
);

const workshopAppModuleOptions = [
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

const carOwnerAppModuleOptions = [
  "owner_garage",
  "owner_vehicles",
  "owner_marketplace",
  "owner_appointments",
  "owner_history",
  "owner_profile",
] as const;

export const appModuleOptions = [
  ...workshopAppModuleOptions,
  ...carOwnerAppModuleOptions,
] as const;

export type AppModuleKey = (typeof appModuleOptions)[number];

export const permissionOptions = [
  "manage_workshop",
  "manage_suppliers",
  "manage_purchase_orders",
  "view_reports",
] as const;

export type AppPermission = (typeof permissionOptions)[number];

export const workshopOperationMatrix = {
  "workshop.manage": ["owner", "admin"],
  "clients.view": ["owner", "admin", "recepcion", "finanzas"],
  "clients.manage": ["owner", "admin", "recepcion", "finanzas"],
  "vehicles.view": ["owner", "admin", "recepcion", "finanzas"],
  "vehicles.manage": ["owner", "admin", "recepcion", "finanzas"],
  "marketplace.view": ["owner", "admin", "recepcion", "finanzas"],
  "marketplace.manage": ["owner", "admin", "recepcion"],
  "quotes.view": ["owner", "admin", "recepcion", "finanzas"],
  "quotes.manage": ["owner", "admin", "recepcion", "finanzas"],
  "documents.client": ["owner", "admin", "recepcion", "finanzas"],
  "documents.internal": ["owner", "admin", "finanzas"],
  "documents.mechanic": ["owner", "admin", "jefe_taller", "recepcion", "mechanic"],
  "work_orders.manage": ["owner", "admin", "jefe_taller", "recepcion"],
  "work_orders.view": ["owner", "admin", "jefe_taller", "recepcion", "finanzas", "mechanic"],
  "work_orders.report": ["owner", "admin", "jefe_taller", "recepcion", "mechanic"],
  "mechanics.view": ["owner", "admin", "jefe_taller", "recepcion"],
  "mechanics.manage": ["owner", "admin", "jefe_taller"],
  "appointments.view": ["owner", "admin", "jefe_taller", "recepcion", "finanzas", "mechanic"],
  "appointments.manage": ["owner", "admin", "jefe_taller", "recepcion"],
  "finances.view": ["owner", "admin", "finanzas"],
  "payments.record": ["owner", "admin", "finanzas"],
  "expenses.record": ["owner", "admin", "finanzas"],
  "inventory.view": ["owner", "admin", "finanzas"],
  "inventory.manage": ["owner", "admin", "finanzas"],
  "inventory.sync_work_order_usage": ["owner", "admin", "recepcion", "finanzas"],
  "suppliers.view": ["owner", "admin", "finanzas"],
  "suppliers.manage": ["owner", "admin", "finanzas"],
  "purchase_orders.view": ["owner", "admin", "finanzas"],
  "purchase_orders.manage": ["owner", "admin", "finanzas"],
} as const satisfies Record<string, readonly WorkshopRole[]>;

export type WorkshopOperation = keyof typeof workshopOperationMatrix;

export type WorkshopOperationSubject = {
  role: WorkshopRole;
  isActive: boolean;
  mechanicId: string | null;
};

export type WorkshopOperationContext = {
  assignedMechanicId?: string | null;
};

export type WorkshopOperationDenialReason =
  | "anonymous"
  | "inactive_member"
  | "operation_not_configured"
  | "role_not_allowed"
  | "work_order_not_assigned";

export type WorkshopOperationDecision =
  | { allowed: true }
  | { allowed: false; reason: WorkshopOperationDenialReason };

const mechanicScopedOperations = new Set<WorkshopOperation>([
  "work_orders.view",
  "work_orders.report",
  "documents.mechanic",
]);

export class WorkshopOperationDeniedError extends Error {
  readonly operation: string;
  readonly reason: WorkshopOperationDenialReason;

  constructor(operation: string, reason: WorkshopOperationDenialReason) {
    super("No tienes permiso para realizar esta operacion en el taller.");
    this.name = "WorkshopOperationDeniedError";
    this.operation = operation;
    this.reason = reason;
  }
}

export function getWorkshopOperationDecision(
  subject: WorkshopOperationSubject | null,
  operation: WorkshopOperation,
  context: WorkshopOperationContext = {},
): WorkshopOperationDecision {
  if (!subject) {
    return { allowed: false, reason: "anonymous" };
  }

  if (!subject.isActive) {
    return { allowed: false, reason: "inactive_member" };
  }

  const allowedRoles = workshopOperationMatrix[operation] as readonly WorkshopRole[] | undefined;

  if (!allowedRoles) {
    return { allowed: false, reason: "operation_not_configured" };
  }

  if (!allowedRoles.includes(subject.role)) {
    return { allowed: false, reason: "role_not_allowed" };
  }

  if (
    subject.role === "mechanic" &&
    mechanicScopedOperations.has(operation) &&
    (!subject.mechanicId ||
      !context.assignedMechanicId ||
      subject.mechanicId !== context.assignedMechanicId)
  ) {
    return { allowed: false, reason: "work_order_not_assigned" };
  }

  return { allowed: true };
}

export function assertWorkshopOperationAllowed(
  subject: WorkshopOperationSubject | null,
  operation: WorkshopOperation,
  context: WorkshopOperationContext = {},
) {
  const decision = getWorkshopOperationDecision(subject, operation, context);

  if (!decision.allowed) {
    throw new WorkshopOperationDeniedError(operation, decision.reason);
  }
}

const roleModules: Record<AppRole, AppModuleKey[]> = {
  owner: [...workshopAppModuleOptions],
  admin: [...workshopAppModuleOptions],
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
  car_owner: [...carOwnerAppModuleOptions],
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
  if (role === "car_owner") {
    return "Propietario de vehiculo";
  }

  return workshopRoleOptions.find((option) => option.value === role)?.label ?? role;
}

export function hasModuleAccess(role: AppRole, moduleKey: AppModuleKey) {
  return roleModules[role].includes(moduleKey);
}

export function getRoleModules(role: AppRole) {
  return roleModules[role];
}

export function hasPermission(role: WorkshopRole, permission: AppPermission) {
  return rolePermissions[role].includes(permission);
}

export function getRolePermissions(role: WorkshopRole) {
  return rolePermissions[role];
}

export function canViewWorkOrderPrices(role: WorkshopRole) {
  return role !== "mechanic";
}

export function canManageWorkOrders(role: WorkshopRole) {
  return (workshopOperationMatrix["work_orders.manage"] as readonly WorkshopRole[]).includes(role);
}

export function canViewClientDocument(role: WorkshopRole) {
  return (workshopOperationMatrix["documents.client"] as readonly WorkshopRole[]).includes(role);
}

export function canViewInternalDocument(role: WorkshopRole) {
  return (workshopOperationMatrix["documents.internal"] as readonly WorkshopRole[]).includes(role);
}

export function canViewMechanicDocument(role: WorkshopRole) {
  return (workshopOperationMatrix["documents.mechanic"] as readonly WorkshopRole[]).includes(role);
}

export function getRoleHomePath(role: AppRole) {
  switch (role) {
    case "car_owner":
      return "/app/garage" as Route;
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
