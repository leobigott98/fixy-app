"use server";

import { revalidatePath } from "next/cache";

import { createExpense, recordPayment } from "@/lib/data/finances";
import { expenseFormSchema, paymentFormSchema, type ExpenseFormValues, type PaymentFormValues } from "@/lib/finances/schema";

type SaveResult =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

function revalidateFinancePaths() {
  revalidatePath("/app/finances");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/clients");
  revalidatePath("/app/work-orders");
}

export async function recordPaymentAction(values: PaymentFormValues): Promise<SaveResult> {
  const parsed = paymentFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa el pago antes de guardarlo.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await recordPayment(parsed.data);
    revalidateFinancePaths();

    return {
      success: true,
      message: "Pago registrado.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo registrar el pago.",
    };
  }
}

export async function createExpenseAction(values: ExpenseFormValues): Promise<SaveResult> {
  const parsed = expenseFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa el gasto antes de guardarlo.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createExpense(parsed.data);
    revalidateFinancePaths();

    return {
      success: true,
      message: "Gasto registrado.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo registrar el gasto.",
    };
  }
}
