import { notFound } from "next/navigation";

import { DocumentAutoPrint } from "@/components/documents/document-auto-print";
import { BackButton, ClientQuoteDocument } from "@/components/documents/repair-document";
import { getPublicClientQuoteDocumentByToken } from "@/lib/data/public-shares";
import { buildPublicQuotePath } from "@/lib/share-links";

type PublicQuoteDocumentPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ print?: string }>;
};

export default async function PublicQuoteDocumentPage({ params, searchParams }: PublicQuoteDocumentPageProps) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const document = await getPublicClientQuoteDocumentByToken(token);
  if (!document) notFound();

  return (
    <>
      {query.print === "1" ? <DocumentAutoPrint /> : null}
      <ClientQuoteDocument
        actions={<BackButton href={buildPublicQuotePath(token)} label="Volver al presupuesto" />}
        document={document}
      />
    </>
  );
}
