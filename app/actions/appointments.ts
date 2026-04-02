"use server";

import { revalidatePath } from "next/cache";

import { appointmentFormSchema, type AppointmentFormValues } from "@/lib/appointments/schema";
import { upsertAppointment } from "@/lib/data/appointments";

type SaveAppointmentResult =
  | {
      success: true;
      message: string;
      appointmentId: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export async function saveAppointmentAction(
  values: AppointmentFormValues,
  appointmentId?: string,
): Promise<SaveAppointmentResult> {
  const parsed = appointmentFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa la cita antes de guardar.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const appointment = await upsertAppointment(parsed.data, appointmentId);

    revalidatePath("/app/calendar");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/clients");
    revalidatePath("/app/vehicles");

    return {
      success: true,
      message: "Cita guardada.",
      appointmentId: appointment.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo guardar la cita.",
    };
  }
}
