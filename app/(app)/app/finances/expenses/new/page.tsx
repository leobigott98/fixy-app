import { PageHeader } from "@/components/shared/page-header";
import { ExpenseForm } from "@/components/finances/expense-form";
import { getExpenseFormOptions } from "@/lib/data/finances";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { buildExpenseFormDefaults } from "@/lib/finances/schema";

type NewExpensePageProps = {
  searchParams: Promise<{
    workOrderId?: string | string[];
  }>;
};

function getQueryValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewExpensePage({ searchParams }: NewExpensePageProps) {
  const workshop = await requireCurrentWorkshop();
  const params = await searchParams;
  const options = await getExpenseFormOptions();

  const initialValues = buildExpenseFormDefaults({
    selectedWorkOrderId: getQueryValue(params.workOrderId),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registrar gasto"
        description="Registra una salida de dinero sin complicar la operacion diaria del taller."
        status="Finanzas"
      />
      <ExpenseForm
        initialValues={initialValues}
        options={options}
        preferredCurrency={workshop.preferred_currency}
      />
    </div>
  );
}
