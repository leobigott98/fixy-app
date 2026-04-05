"use server";

import { revalidatePath } from "next/cache";

import {
  createCarOwnerAppointmentRequest,
  createCarOwnerServiceRecord,
  createOwnerWorkshopReview,
  upsertCarOwnerVehicle,
  upsertCurrentCarOwnerProfile,
} from "@/lib/data/car-owners";
import {
  normalizeOwnerServiceRecordInput,
  normalizeOwnerVehicleInput,
  ownerAppointmentFormSchema,
  ownerProfileFormSchema,
  ownerReviewFormSchema,
  ownerServiceRecordFormSchema,
  ownerVehicleFormSchema,
  type OwnerAppointmentFormValues,
  type OwnerProfileFormValues,
  type OwnerReviewFormValues,
  type OwnerServiceRecordFormValues,
  type OwnerVehicleFormValues,
} from "@/lib/car-owners/schema";

type ActionError = {
  success: false;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

type ActionSuccess<T extends object = {}> = {
  success: true;
  message: string;
} & T;

export async function saveOwnerProfileAction(
  values: OwnerProfileFormValues,
): Promise<ActionSuccess | ActionError> {
  const parsed = ownerProfileFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa tu perfil antes de guardar.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await upsertCurrentCarOwnerProfile(parsed.data);

    revalidatePath("/app");
    revalidatePath("/app/garage");
    revalidatePath("/app/profile");

    return {
      success: true,
      message: "Perfil guardado.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo guardar tu perfil.",
    };
  }
}

export async function saveOwnerVehicleAction(
  values: OwnerVehicleFormValues,
  vehicleId?: string,
): Promise<ActionSuccess<{ vehicleId: string }> | ActionError> {
  const parsed = ownerVehicleFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa los datos del carro.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const vehicle = await upsertCarOwnerVehicle(normalizeOwnerVehicleInput(parsed.data), vehicleId);

    revalidatePath("/app/garage");
    revalidatePath("/app/my-cars");
    revalidatePath("/app/appointments");
    revalidatePath("/app/history");

    return {
      success: true,
      message: "Carro guardado.",
      vehicleId: vehicle.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo guardar el carro.",
    };
  }
}

export async function createOwnerAppointmentAction(
  values: OwnerAppointmentFormValues,
): Promise<ActionSuccess | ActionError> {
  const parsed = ownerAppointmentFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa la cita antes de enviarla.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createCarOwnerAppointmentRequest(parsed.data);

    revalidatePath("/app/garage");
    revalidatePath("/app/appointments");
    revalidatePath("/app/workshops");

    return {
      success: true,
      message: "Solicitud enviada al taller.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo registrar la cita.",
    };
  }
}

export async function createOwnerServiceRecordAction(
  values: OwnerServiceRecordFormValues,
): Promise<ActionSuccess | ActionError> {
  const parsed = ownerServiceRecordFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa el historial antes de guardar.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createCarOwnerServiceRecord(normalizeOwnerServiceRecordInput(parsed.data));

    revalidatePath("/app/garage");
    revalidatePath("/app/history");

    return {
      success: true,
      message: "Servicio agregado al historial.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo guardar el historial.",
    };
  }
}

export async function createOwnerReviewAction(
  values: OwnerReviewFormValues,
): Promise<ActionSuccess | ActionError> {
  const parsed = ownerReviewFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa la reseña antes de publicarla.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createOwnerWorkshopReview(parsed.data);

    revalidatePath("/app/history");
    revalidatePath("/app/workshops");
    revalidatePath("/talleres");

    return {
      success: true,
      message: "Reseña publicada.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo publicar la reseña.",
    };
  }
}
