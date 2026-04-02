import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/shared/page-header";
import { getClientForEdit } from "@/lib/data/clients";
import type { ClientProfileInput } from "@/lib/clients/schema";

type EditClientPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { id } = await params;
  const client = await getClientForEdit(id);

  const initialValues: ClientProfileInput = {
    fullName: client.full_name,
    phone: client.phone ?? "",
    whatsappPhone: client.whatsapp_phone ?? "",
    email: client.email ?? "",
    notes: client.notes ?? "",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar ${client.full_name}`}
        description="Mantiene la ficha del cliente alineada con la operacion real del taller."
        status="Clientes"
      />
      <ClientForm clientId={client.id} initialValues={initialValues} mode="edit" />
    </div>
  );
}
