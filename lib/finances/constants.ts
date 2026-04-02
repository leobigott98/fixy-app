export const collectedPaymentStatuses = ["paid", "partial"] as const;

export const paymentStatusOptions = [
  { value: "pending", label: "Pendiente" },
  { value: "partial", label: "Parcial" },
  { value: "paid", label: "Pagado" },
  { value: "overdue", label: "Vencido" },
  { value: "cancelled", label: "Cancelado" },
] as const;

export const paymentMethodOptions = [
  { value: "cash", label: "Efectivo" },
  { value: "bank_transfer", label: "Transferencia" },
  { value: "pago_movil", label: "Pago movil" },
  { value: "zelle", label: "Zelle" },
  { value: "card", label: "Tarjeta" },
  { value: "other", label: "Otro" },
] as const;

export const expenseCategoryOptions = [
  { value: "repuestos", label: "Repuestos" },
  { value: "nomina", label: "Nomina" },
  { value: "servicios", label: "Servicios" },
  { value: "transporte", label: "Transporte" },
  { value: "herramientas", label: "Herramientas" },
  { value: "operacion", label: "Operacion" },
  { value: "other", label: "Otro" },
] as const;

export type PaymentStatus = (typeof paymentStatusOptions)[number]["value"];
export type PaymentMethod = (typeof paymentMethodOptions)[number]["value"];
export type ExpenseCategory = (typeof expenseCategoryOptions)[number]["value"];

export function getPaymentStatusLabel(status: PaymentStatus) {
  return paymentStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export function getPaymentMethodLabel(method: PaymentMethod) {
  return paymentMethodOptions.find((option) => option.value === method)?.label ?? method;
}

export function getExpenseCategoryLabel(category: ExpenseCategory) {
  return expenseCategoryOptions.find((option) => option.value === category)?.label ?? category;
}

export function isCollectedPaymentStatus(status: string | null | undefined) {
  return status === "paid" || status === "partial";
}
