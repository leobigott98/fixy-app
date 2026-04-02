import { z } from "zod";

export const vehicleProfileFormSchema = z.object({
  clientId: z.string().uuid("Selecciona un cliente."),
  make: z.string().trim().min(2, "Ingresa la marca."),
  model: z.string().trim().min(1, "Ingresa el modelo."),
  year: z
    .string()
    .trim()
    .refine((value) => /^\d{4}$/.test(value), "Ingresa un anio valido.")
    .refine((value) => {
      const year = Number(value);
      return year >= 1950 && year <= 2100;
    }, "Ingresa un anio valido."),
  plate: z.string().trim().min(3, "Ingresa la placa."),
  color: z.string().trim(),
  mileage: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || /^\d+$/.test(value), "Ingresa un kilometraje valido."),
  vin: z.string().trim(),
  notes: z.string().trim(),
});

export type VehicleProfileFormValues = z.infer<typeof vehicleProfileFormSchema>;

export type VehicleProfileInput = {
  clientId: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  color: string;
  mileage?: number;
  vin: string;
  notes: string;
};

export function normalizeVehicleProfileInput(values: VehicleProfileFormValues): VehicleProfileInput {
  return {
    clientId: values.clientId,
    make: values.make,
    model: values.model,
    year: Number(values.year),
    plate: values.plate,
    color: values.color,
    mileage: values.mileage ? Number(values.mileage) : undefined,
    vin: values.vin,
    notes: values.notes,
  };
}

export function buildVehicleLabel(input: Pick<VehicleProfileInput, "make" | "model" | "year" | "plate">) {
  return `${input.make} ${input.model} ${input.year} - ${input.plate}`;
}
