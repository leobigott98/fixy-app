import { DocumentAutoPrint } from "@/components/documents/document-auto-print";
import { BackButton, ClientQuoteDocument } from "@/components/documents/repair-document";
import { getClientQuoteDocument } from "@/lib/data/repair-documents";

type QuoteDocumentPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
};

export default async function QuoteDocumentPage({ params, searchParams }: QuoteDocumentPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const document = await getClientQuoteDocument(id);

  return (
    <>
      {query.print === "1" ? <DocumentAutoPrint /> : null}
      <ClientQuoteDocument
        actions={<BackButton href={`/app/quotes/${id}`} label="Volver al presupuesto" />}
        document={document}
      />
    </>
  );
}
