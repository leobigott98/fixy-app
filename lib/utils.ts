import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: "USD" | "VES" = "USD") {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "VES" ? 2 : 0,
  }).format(amount);
}

export function formatCurrencyDisplay(
  amount: number,
  currencyDisplay: "USD" | "VES" | "USD_VES",
) {
  if (currencyDisplay === "VES") {
    return formatCurrency(amount, "VES");
  }

  return formatCurrency(amount, "USD");
}
