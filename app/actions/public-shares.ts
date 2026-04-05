"use server";

import { revalidatePath } from "next/cache";

import { ensureQuotePublicShare } from "@/lib/data/quotes";
import { ensureWorkOrderPublicShare } from "@/lib/data/work-orders";
import { approvePublicQuoteByToken } from "@/lib/data/public-shares";

export async function ensureQuotePublicShareAction(quoteId: string) {
  try {
    const share = await ensureQuotePublicShare(quoteId);

    revalidatePath(`/app/quotes/${quoteId}`);
    revalidatePath("/app/quotes");

    return {
      success: true,
      message: "Link del cliente listo.",
      ...share,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo preparar el link del presupuesto.",
    };
  }
}

export async function ensureWorkOrderPublicShareAction(workOrderId: string) {
  try {
    const share = await ensureWorkOrderPublicShare(workOrderId);

    revalidatePath(`/app/work-orders/${workOrderId}`);
    revalidatePath("/app/work-orders");

    return {
      success: true,
      message: "Link del cliente listo.",
      ...share,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo preparar el link de la orden.",
    };
  }
}

export async function approvePublicQuoteAction(token: string) {
  try {
    const quote = await approvePublicQuoteByToken(token);

    revalidatePath(`/presupuestos/${token}`);
    revalidatePath(`/presupuestos/${token}/documento`);
    revalidatePath(`/app/quotes/${quote.id}`);
    revalidatePath("/app/quotes");
    revalidatePath("/app/dashboard");

    return {
      success: true,
      message: "Presupuesto aprobado.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo aprobar el presupuesto.",
    };
  }
}
