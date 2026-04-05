import type { Route } from "next";
import Link from "next/link";

import { PurchaseOrderForm } from "@/components/purchase-orders/purchase-order-form";
import { PermissionBanner } from "@/components/shared/permission-banner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getPurchaseOrderFormOptions } from "@/lib/data/purchase-orders";
import { getCurrentWorkshopAccess, requireCurrentWorkshop } from "@/lib/data/workshops";
import { hasPermission } from "@/lib/permissions";

export default async function NewPurchaseOrderPage() {
  const workshop = await requireCurrentWorkshop();
  const access = await getCurrentWorkshopAccess();
  const canManage = hasPermission(access?.role ?? "mechanic", "manage_purchase_orders");
  const options = await getPurchaseOrderFormOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva compra"
        description="Carga una orden de compra ligera para reposicion y seguimiento."
        status="Sprint 11"
      />

      {canManage ? (
        <PurchaseOrderForm
          mode="create"
          options={options}
          preferredCurrency={workshop.preferred_currency}
        />
      ) : (
        <>
          <PermissionBanner
            title="Edicion reservada"
            description="La base de permisos ya separa mecanicos de owner/admin. En este sprint solo owner y admin pueden crear compras."
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
