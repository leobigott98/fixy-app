import { PageHeader } from "@/components/shared/page-header";
import { QuoteForm } from "@/components/quotes/quote-form";
import { buildQuoteFormDefaults, getQuoteForEdit, getQuoteFormOptions } from "@/lib/data/quotes";
import { requireCurrentWorkshop } from "@/lib/data/workshops";

type EditQuotePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditQuotePage({ params }: EditQuotePageProps) {
  const workshop = await requireCurrentWorkshop();
  const { id } = await params;
  const [detail, options] = await Promise.all([getQuoteForEdit(id), getQuoteFormOptions()]);

  const initialValues = buildQuoteFormDefaults(options, {
    quote: detail.quote,
    laborItems: detail.laborItems,
    partItems: detail.partItems,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar ${detail.quote.title}`}
        description="Actualiza items, estado y totales manteniendo el presupuesto claro y rapido."
        status="Presupuestos"
      />
      <QuoteForm
        initialValues={initialValues}
        mode="edit"
        options={options}
        preferredCurrency={workshop.preferred_currency}
        quoteId={detail.quote.id}
      />
    </div>
  );
}
