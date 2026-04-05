"use server";

import { revalidatePath } from "next/cache";

import {
  confirmAndScheduleMarketplaceInquiry,
  createMarketplaceInquiry,
  createMarketplaceReview,
  markMarketplaceInquiryAsContacted,
  respondToWorkshopReview,
} from "@/lib/data/marketplace";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import {
  marketplaceInquirySchema,
  marketplaceReviewSchema,
  workshopReviewResponseSchema,
  type MarketplaceInquiryInput,
  type MarketplaceReviewInput,
} from "@/lib/marketplace/schema";
import { buildWorkshopPublicPath } from "@/lib/workshops/schema";
import { buildWhatsAppHref } from "@/lib/whatsapp";

type SubmitMarketplaceInquiryResult =
  | {
      success: true;
      message: string;
      whatsappHref: string | null;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export async function submitMarketplaceInquiryAction(
  workshopSlug: string,
  values: MarketplaceInquiryInput,
): Promise<SubmitMarketplaceInquiryResult> {
  const parsed = marketplaceInquirySchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa los datos de tu solicitud.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await createMarketplaceInquiry(workshopSlug, parsed.data);
    const visiblePhone =
      result.workshop.public_contact_phone || result.workshop.whatsapp_phone || null;
    const whatsappHref = buildWhatsAppHref(
      visiblePhone,
      `Hola ${result.workshop.workshop_name}, ya envie una solicitud en Fixy para ${parsed.data.requestedService}. Mi nombre es ${parsed.data.requesterName}.`,
    );

    revalidatePath("/talleres");
    revalidatePath(buildWorkshopPublicPath(result.workshop.public_slug));

    return {
      success: true,
      message:
        "Solicitud enviada. El taller ya tiene tus datos basicos y puedes reforzar por WhatsApp si quieres acelerar la respuesta.",
      whatsappHref,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo registrar la solicitud en este momento.",
    };
  }
}

export async function markMarketplaceInquiryAsContactedAction(inquiryId: string) {
  const workshop = await requireCurrentWorkshop();
  await markMarketplaceInquiryAsContacted(inquiryId, workshop.id);

  revalidatePath("/app");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/notifications");
}

export async function confirmAndScheduleMarketplaceInquiryAction(inquiryId: string) {
  const workshop = await requireCurrentWorkshop();
  await confirmAndScheduleMarketplaceInquiry(inquiryId, workshop.id);

  revalidatePath("/app");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/notifications");
  revalidatePath("/app/calendar");
  revalidatePath("/app/appointments");
}

type SubmitMarketplaceReviewResult =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export async function submitMarketplaceReviewAction(
  workshopSlug: string,
  values: MarketplaceReviewInput,
): Promise<SubmitMarketplaceReviewResult> {
  const parsed = marketplaceReviewSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa tu resena antes de enviarla.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await createMarketplaceReview(workshopSlug, parsed.data);

    revalidatePath(buildWorkshopPublicPath(result.workshop.public_slug));
    revalidatePath("/app/reviews");

    return {
      success: true,
      message: "Resena publicada. Gracias por compartir tu experiencia.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo publicar la resena en este momento.",
    };
  }
}

export async function respondToWorkshopReviewAction(reviewId: string, formData: FormData) {
  const workshop = await requireCurrentWorkshop();
  const parsed = workshopReviewResponseSchema.parse({
    response: formData.get("response"),
  });

  await respondToWorkshopReview(reviewId, workshop.id, parsed);

  revalidatePath("/app/reviews");
  if (workshop.public_slug) {
    revalidatePath(buildWorkshopPublicPath(workshop.public_slug));
  }
  revalidatePath("/talleres");
}
