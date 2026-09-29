import { DocumentAutoPrint } from "@/components/documents/document-auto-print";
import { BackButton, MechanicWorkOrderDocument } from "@/components/documents/repair-document";
import { getMechanicWorkOrderDocument } from "@/lib/data/repair-documents";
import { requireCurrentWorkshop } from "@/lib/data/workshops";

type WorkOrderDocumentPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
};

export default async function WorkOrderDocumentPage({ params, searchParams }: WorkOrderDocumentPageProps) {
  const [{ id }, query, workshop] = await Promise.all([params, searchParams, requireCurrentWorkshop()]);
  const document = await getMechanicWorkOrderDocument(id);

  return (
    <>
      {query.print === "1" ? <DocumentAutoPrint /> : null}
      <MechanicWorkOrderDocument
        actions={<BackButton href={`/app/work-orders/${id}`} label="Volver a la orden" />}
        document={document}
        workshop={{
          name: workshop.workshop_name,
          address: workshop.public_address,
          city: workshop.city,
          phone: workshop.public_contact_phone || workshop.whatsapp_phone,
          email: workshop.public_contact_email,
          taxId: workshop.tax_id,
          logoUrl: workshop.logo_url,
          warrantyTerms: null,
          documentTerms: null,
        }}
      />
    </>
  );
}
