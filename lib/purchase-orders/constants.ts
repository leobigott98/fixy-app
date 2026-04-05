export const purchaseOrderStatusOptions = [
  { value: "draft", label: "Borrador" },
  { value: "sent", label: "Enviada" },
  { value: "received", label: "Recibida" },
  { value: "cancelled", label: "Cancelada" },
] as const;

export type PurchaseOrderStatus = (typeof purchaseOrderStatusOptions)[number]["value"];

export function getPurchaseOrderStatusLabel(status: PurchaseOrderStatus | string) {
  return purchaseOrderStatusOptions.find((option) => option.value === status)?.label ?? status;
}
