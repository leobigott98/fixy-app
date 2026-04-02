import { PageHeader } from "@/components/shared/page-header";
import { PaymentForm } from "@/components/finances/payment-form";
import { buildPaymentFormDefaults } from "@/lib/finances/schema";
import { getPaymentFormOptions } from "@/lib/data/finances";
import { requireCurrentWorkshop } from "@/lib/data/workshops";

type NewPaymentPageProps = {
  searchParams: Promise<{
    clientId?: string | string[];
    workOrderId?: string | string[];
  }>;
};

function getQueryValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewPaymentPage({ searchParams }: NewPaymentPageProps) {
  const workshop = await requireCurrentWorkshop();
  const params = await searchParams;
  const options = await getPaymentFormOptions();

  const initialValues = buildPaymentFormDefaults({
    selectedClientId: getQueryValue(params.clientId),
    selectedWorkOrderId: getQueryValue(params.workOrderId),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registrar pago"
        description="Carga un cobro rapido para que caja y ordenes hablen el mismo idioma."
        status="Finanzas"
      />
      <PaymentForm
        initialValues={initialValues}
        options={options}
        preferredCurrency={workshop.preferred_currency}
      />
    </div>
  );
}
