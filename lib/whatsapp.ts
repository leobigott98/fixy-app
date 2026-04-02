import { formatCurrencyDisplay } from "@/lib/utils";

type CurrencyDisplay = "USD" | "VES" | "USD_VES";

function cleanPhone(phone: string) {
  return phone.replace(/\D+/g, "");
}

export function normalizeWhatsAppPhone(phone?: string | null) {
  if (!phone) {
    return null;
  }

  const digits = cleanPhone(phone);

  if (!digits) {
    return null;
  }

  if (digits.startsWith("58")) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length >= 10) {
    return `58${digits.slice(1)}`;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `58${digits.slice(-10)}`;
  }

  return digits;
}

export function buildWhatsAppHref(phone: string | null | undefined, message: string) {
  const normalizedPhone = normalizeWhatsAppPhone(phone);

  if (!normalizedPhone) {
    return null;
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export function buildQuoteReference(quoteId: string) {
  return `PR-${quoteId.slice(-6).toUpperCase()}`;
}

function buildVehicleSummary(vehicle?: {
  vehicle_label?: string | null;
  make?: string | null;
  model?: string | null;
  plate?: string | null;
} | null) {
  return (
    vehicle?.vehicle_label ??
    [vehicle?.make, vehicle?.model, vehicle?.plate].filter(Boolean).join(" ") ??
    "tu vehiculo"
  );
}

export function buildClientGreetingMessage(input: {
  clientName: string;
  workshopName: string;
  vehicleSummary?: string | null;
}) {
  return [
    `Hola ${input.clientName}, te escribe ${input.workshopName}.`,
    input.vehicleSummary ? `Tenemos registrado ${input.vehicleSummary}.` : null,
    "Quedo atento por aqui para ayudarte con tu servicio.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildQuoteWhatsAppMessage(input: {
  clientName: string;
  workshopName: string;
  vehicleSummary: string;
  quoteId: string;
  total: number;
  currency: CurrencyDisplay;
}) {
  return [
    `Hola ${input.clientName}, te escribe ${input.workshopName}.`,
    `Ya tenemos listo tu presupuesto ${buildQuoteReference(input.quoteId)} para ${input.vehicleSummary}.`,
    `Total: ${formatCurrencyDisplay(input.total, input.currency)}.`,
    "Si deseas aprobarlo o tienes alguna duda, respondeme por aqui.",
  ].join(" ");
}

export function buildWorkOrderStatusMessage(input: {
  clientName: string;
  workshopName: string;
  vehicleSummary: string;
  workOrderCode?: string | null;
  statusLabel: string;
}) {
  return [
    `Hola ${input.clientName}, te escribe ${input.workshopName}.`,
    `Actualizacion de tu orden ${input.workOrderCode || "de trabajo"} para ${input.vehicleSummary}:`,
    `Estado actual: ${input.statusLabel}.`,
    "Cualquier detalle adicional te lo compartimos por esta via.",
  ].join(" ");
}

export function buildReadyForPickupMessage(input: {
  clientName: string;
  workshopName: string;
  vehicleSummary: string;
  workOrderCode?: string | null;
  total: number;
  pendingBalance: number;
  currency: CurrencyDisplay;
}) {
  return [
    `Hola ${input.clientName}, te escribe ${input.workshopName}.`,
    `${input.vehicleSummary} ya esta listo para entrega${input.workOrderCode ? ` en la orden ${input.workOrderCode}` : ""}.`,
    `Total: ${formatCurrencyDisplay(input.total, input.currency)}.`,
    input.pendingBalance > 0
      ? `Saldo pendiente: ${formatCurrencyDisplay(input.pendingBalance, input.currency)}.`
      : "La orden no tiene saldo pendiente registrado.",
    "Escribenos por aqui para coordinar retiro.",
  ].join(" ");
}

export function buildPaymentReminderMessage(input: {
  clientName: string;
  workshopName: string;
  vehicleSummary: string;
  workOrderCode?: string | null;
  pendingBalance: number;
  currency: CurrencyDisplay;
}) {
  return [
    `Hola ${input.clientName}, te escribe ${input.workshopName}.`,
    `Te recordamos el saldo pendiente${input.workOrderCode ? ` de la orden ${input.workOrderCode}` : ""} para ${input.vehicleSummary}.`,
    `Pendiente por pagar: ${formatCurrencyDisplay(input.pendingBalance, input.currency)}.`,
    "Si ya realizaste el pago, puedes responder por aqui y enviarnos el comprobante.",
  ].join(" ");
}

export { buildVehicleSummary };
