import { InventoryItemForm } from "@/components/inventory/inventory-item-form";
import { PageHeader } from "@/components/shared/page-header";
import { buildInventoryItemFormDefaults } from "@/lib/inventory/schema";
import { requireCurrentWorkshop } from "@/lib/data/workshops";

export default async function NewInventoryItemPage() {
  const workshop = await requireCurrentWorkshop();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo repuesto"
        description="Agrega una pieza al inventario para reutilizarla rapido en presupuestos y ordenes."
        status="Inventario"
      />
      <InventoryItemForm
        initialValues={buildInventoryItemFormDefaults()}
        mode="create"
        preferredCurrency={workshop.preferred_currency}
      />
    </div>
  );
}
