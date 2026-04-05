import type { Route } from "next";
import Link from "next/link";

import { PurchaseOrderForm } from "@/components/purchase-orders/purchase-order-form";
import { PermissionBanner } from "@/components/shared/permission-banner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  getPurchaseOrderFormOptions,
  requirePurchaseOrderOrRedirect,
} from "@/lib/data/purchase-orders";
import { getCurrentWorkshopAccess, requireCurrentWorkshop } from "@/lib/data/workshops";
import { hasPermission } from "@/lib/permissions";
import { buildPurchaseOrderFormDefaults } from "@/lib/purchase-orders/schema";

type EditPurchaseOrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditPurchaseOrderPage({ params }: EditPurchaseOrderPageProps) {
  const workshop = await requireCurrentWorkshop();
  const access = await getCurrentWorkshopAccess();
  const canManage = hasPermission(access?.role ?? "mechanic", "manage_purchase_orders");
  const { id } = await params;
  const [detail, options] = await Promise.all([
    requirePurchaseOrderOrRedirect(id),
    getPurchaseOrderFormOptions(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar compra"
        description="Mantén clara la compra, el proveedor y el monto sin complicar el módulo."
        status="Sprint 11"
      />

      {canManage ? (
        <PurchaseOrderForm
          purchaseOrderId={detail.purchaseOrder.id}
          mode="edit"
          options={options}
          preferredCurrency={workshop.preferred_currency}
          initialValues={buildPurchaseOrderFormDefaults({
            supplierId: detail.purchaseOrder.supplier_id,
            date: detail.purchaseOrder.ordered_at,
            status: detail.purchaseOrder.status,
            notes: detail.purchaseOrder.notes,
            items: detail.items,
          })}
        />
      ) : (
        <>
          <PermissionBanner
            title="Edicion reservada"
            description="La vista ya es sensible al rol. La escritura queda intencionalmente reservada para owner y admin."
            tone="warning"
          />
          <Button asChild variant="outline">
            <Link href={"/app/purchase-orders" as Route}>Volver a compras</Link>
          </Button>
        </>
      )}
    </div>
  );
}
