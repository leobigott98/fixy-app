import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import type { ClientProfileInput } from "@/lib/clients/schema";

export default async function NewClientPage() {
  await requireCurrentWorkshop();

  const initialValues: ClientProfileInput = {
    fullName: "",
    phone: "",
    whatsappPhone: "",
    email: "",
    notes: "",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo cliente"
        description="Crea una ficha simple, clara y lista para vincular vehiculos y futuros trabajos."
        status="Clientes"
      />
      <ClientForm initialValues={initialValues} mode="create" />
    </div>
  );
}
