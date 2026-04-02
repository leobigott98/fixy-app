export const mechanicRoleOptions = [
  { value: "mecanico", label: "Mecanico" },
  { value: "jefe_taller", label: "Jefe de taller" },
  { value: "recepcion", label: "Recepcion" },
  { value: "admin", label: "Admin" },
  { value: "apoyo", label: "Apoyo" },
  { value: "otro", label: "Otro" },
] as const;

export type MechanicRole = (typeof mechanicRoleOptions)[number]["value"];

export function getMechanicRoleLabel(role: MechanicRole | string) {
  return mechanicRoleOptions.find((option) => option.value === role)?.label ?? role;
}
