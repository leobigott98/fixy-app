"use server";

import { revalidatePath } from "next/cache";

import { upsertQuote } from "@/lib/data/quotes";
import { quoteFormSchema, type QuoteFormValues } from "@/lib/quotes/schema";

type SaveQuoteResult =
  | {
      success: true;
      message: string;
      quoteId: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export async function saveQuoteAction(
  values: QuoteFormValues,
  quoteId?: string,
): Promise<SaveQuoteResult> {
  const parsed = quoteFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa el presupuesto antes de guardar.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const quote = await upsertQuote(parsed.data, quoteId);

    revalidatePath("/app/quotes");
    revalidatePath(`/app/quotes/${quote.id}`);
    revalidatePath("/app/dashboard");
    revalidatePath("/app/clients");
    revalidatePath("/app/vehicles");

    return {
      success: true,
      message: "Presupuesto guardado.",
      quoteId: quote.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo guardar el presupuesto.",
    };
  }
}
