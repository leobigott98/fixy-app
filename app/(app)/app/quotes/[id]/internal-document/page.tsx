import { notFound } from "next/navigation";

import { DocumentAutoPrint } from "@/components/documents/document-auto-print";
import { BackButton, InternalCostDocument } from "@/components/documents/repair-document";
import { getInternalCostDocument } from "@/lib/data/repair-documents";
import { getCurrentWorkshopAccess } from "@/lib/data/workshops";
import { canViewInternalDocument } from "@/lib/permissions";

type InternalDocumentPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
};

export default async function InternalDocumentPage({ params, searchParams }: InternalDocumentPageProps) {
  const access = await getCurrentWorkshopAccess();
  if (!access || !canViewInternalDocument(access.role)) notFound();

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const document = await getInternalCostDocument(id);

  return (
    <>
      {query.print === "1" ? <DocumentAutoPrint /> : null}
      <InternalCostDocument
        actions={<BackButton href={`/app/quotes/${id}`} label="Volver al presupuesto" />}
        document={document}
      />
    </>
  );
}
