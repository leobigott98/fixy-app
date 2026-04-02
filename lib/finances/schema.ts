import { z } from "zod";

import {
  expenseCategoryOptions,
  paymentMethodOptions,
  paymentStatusOptions,
  type ExpenseCategory,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/finances/constants";

const positiveAmountMessage = "Ingresa un monto valido.";

function parseAmount(value: string) {
  const amount = Number(value ?? 0);
  return Number.isNaN(amount) ? 0 : Number(amount.toFixed(2));
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

export const paymentFormSchema = z.object({
  clientId: z.string().min(1, "Selecciona un cliente."),
  workOrderId: z.string(),
  amount: z
    .string()
    .min(1, positiveAmountMessage)
    .refine((value) => parseAmount(value) > 0, positiveAmountMessage),
  status: z.enum(paymentStatusOptions.map((option) => option.value) as [PaymentStatus, ...PaymentStatus[]]),
  method: z.enum(paymentMethodOptions.map((option) => option.value) as [PaymentMethod, ...PaymentMethod[]]),
  date: z.string().min(1, "Selecciona la fecha."),
  notes: z.string().max(500, "Usa una nota mas corta."),
});

export type PaymentFormValues = {
  clientId: string;
  workOrderId: string;
  amount: string;
  status: PaymentStatus;
  method: PaymentMethod;
  date: string;
  notes: string;
};

export type PaymentInput = {
  clientId: string;
  workOrderId: string | null;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  date: string;
  notes: string | null;
};

export function normalizePaymentInput(values: PaymentFormValues): PaymentInput {
  return {
    clientId: values.clientId,
    workOrderId: values.workOrderId?.trim() ? values.workOrderId : null,
    amount: parseAmount(values.amount),
    status: values.status,
    method: values.method,
    date: values.date,
    notes: values.notes?.trim() ? values.notes.trim() : null,
  };
}

export function buildPaymentFormDefaults(source?: {
  selectedClientId?: string;
  selectedWorkOrderId?: string;
}) {
  return {
    clientId: source?.selectedClientId ?? "",
    workOrderId: source?.selectedWorkOrderId ?? "",
    amount: "",
    status: "paid" as PaymentStatus,
    method: "pago_movil" as PaymentMethod,
    date: todayValue(),
    notes: "",
  } satisfies PaymentFormValues;
}

export const expenseFormSchema = z.object({
  workOrderId: z.string(),
  amount: z
    .string()
    .min(1, positiveAmountMessage)
    .refine((value) => parseAmount(value) > 0, positiveAmountMessage),
  category: z.enum(
    expenseCategoryOptions.map((option) => option.value) as [ExpenseCategory, ...ExpenseCategory[]],
  ),
  date: z.string().min(1, "Selecciona la fecha."),
  notes: z.string().max(500, "Usa una nota mas corta."),
});

export type ExpenseFormValues = {
  workOrderId: string;
  amount: string;
  category: ExpenseCategory;
  date: string;
  notes: string;
};

export type ExpenseInput = {
  workOrderId: string | null;
  amount: number;
  category: ExpenseCategory;
  date: string;
  notes: string | null;
};

export function normalizeExpenseInput(values: ExpenseFormValues): ExpenseInput {
  return {
    workOrderId: values.workOrderId?.trim() ? values.workOrderId : null,
    amount: parseAmount(values.amount),
    category: values.category,
    date: values.date,
    notes: values.notes?.trim() ? values.notes.trim() : null,
  };
}

export function buildExpenseFormDefaults(source?: { selectedWorkOrderId?: string }) {
  return {
    workOrderId: source?.selectedWorkOrderId ?? "",
    amount: "",
    category: "repuestos" as ExpenseCategory,
    date: todayValue(),
    notes: "",
  } satisfies ExpenseFormValues;
}
