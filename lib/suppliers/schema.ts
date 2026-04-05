import { z } from "zod";

export const supplierFormSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre del proveedor."),
  phone: z.string().trim(),
  notes: z.string().trim(),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export function buildSupplierFormDefaults(
  source?: Partial<{
    name: string | null;
    phone: string | null;
    notes: string | null;
  }>,
): SupplierFormValues {
  return {
    name: source?.name ?? "",
    phone: source?.phone ?? "",
    notes: source?.notes ?? "",
  };
}
