import { PageHeader } from "@/components/shared/page-header";
import { WorkOrderForm } from "@/components/work-orders/work-order-form";
import {
  buildWorkOrderFormDefaults,
  getWorkOrderForEdit,
  getWorkOrderFormOptions,
} from "@/lib/data/work-orders";
import { requireCurrentWorkshop } from "@/lib/data/workshops";

type EditWorkOrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditWorkOrderPage({ params }: EditWorkOrderPageProps) {
  const workshop = await requireCurrentWorkshop();
  const { id } = await params;
  const [detail, options] = await Promise.all([getWorkOrderForEdit(id), getWorkOrderFormOptions()]);

  const initialValues = buildWorkOrderFormDefaults(options, {
    workOrder: detail.workOrder,
    services: detail.services,
    parts: detail.parts,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar ${detail.workOrder.title}`}
        description="Actualiza etapa, items y responsable sin perder el ritmo operativo del taller."
        status="Ordenes"
      />
      <WorkOrderForm
        initialValues={initialValues}
        mode="edit"
        options={options}
        preferredCurrency={workshop.preferred_currency}
        workOrderId={detail.workOrder.id}
      />
    </div>
  );
}
