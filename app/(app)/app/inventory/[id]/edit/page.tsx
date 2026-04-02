import { InventoryItemForm } from "@/components/inventory/inventory-item-form";
import { PageHeader } from "@/components/shared/page-header";
import {
  getInventoryItemForEdit,
  requireInventoryItemOrRedirect,
} from "@/lib/data/inventory";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { buildInventoryItemFormDefaults } from "@/lib/inventory/schema";

type EditInventoryItemPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditInventoryItemPage({
  params,
}: EditInventoryItemPageProps) {
  const { id } = await params;
  const workshop = await requireCurrentWorkshop();
  await requireInventoryItemOrRedirect(id);
  const item = await getInventoryItemForEdit(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar ${item.name}`}
        description="Actualiza stock, costo o referencia de venta sin perder el flujo del taller."
        status="Inventario"
      />
      <InventoryItemForm
        initialValues={buildInventoryItemFormDefaults({
          name: item.name,
          description: item.description,
          stockQuantity: item.stock_quantity,
          lowStockThreshold: item.low_stock_threshold,
          cost: item.cost,
          referenceSalePrice: item.reference_sale_price,
          sku: item.sku,
          notes: item.notes,
        })}
        itemId={item.id}
        mode="edit"
        preferredCurrency={workshop.preferred_currency}
      />
    </div>
  );
}
