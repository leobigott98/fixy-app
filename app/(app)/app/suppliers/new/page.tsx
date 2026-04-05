import type { Route } from "next";
import Link from "next/link";

import { SupplierForm } from "@/components/suppliers/supplier-form";
import { PermissionBanner } from "@/components/shared/permission-banner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentWorkshopAccess, requireCurrentWorkshop } from "@/lib/data/workshops";
import { hasPermission } from "@/lib/permissions";

export default async function NewSupplierPage() {
  await requireCurrentWorkshop();
  const access = await getCurrentWorkshopAccess();
  const canManage = hasPermission(access?.role ?? "mechanic", "manage_suppliers");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo proveedor"
        description="Carga solo lo necesario para que el taller pueda comprar mejor."
        status="Sprint 11"
      />

      {canManage ? (
        <SupplierForm mode="create" />
      ) : (
        <>
          <PermissionBanner
            title="Edicion reservada"
            description="La base de permisos ya reconoce este modulo, pero por ahora solo owner y admin pueden crear proveedores."
            tone="warning"
          />
          <Button asChild variant="outline">
            <Link href={"/app/suppliers" as Route}>Volver a proveedores</Link>
          </Button>
        </>
      )}
    </div>
  );
}
