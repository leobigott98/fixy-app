import type { Route } from "next";
import Link from "next/link";

import { SupplierForm } from "@/components/suppliers/supplier-form";
import { PermissionBanner } from "@/components/shared/permission-banner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireSupplierOrRedirect } from "@/lib/data/suppliers";
import { getCurrentWorkshopAccess, requireCurrentWorkshop } from "@/lib/data/workshops";
import { buildSupplierFormDefaults } from "@/lib/suppliers/schema";
import { hasPermission } from "@/lib/permissions";

type EditSupplierPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditSupplierPage({ params }: EditSupplierPageProps) {
  await requireCurrentWorkshop();
  const access = await getCurrentWorkshopAccess();
  const canManage = hasPermission(access?.role ?? "mechanic", "manage_suppliers");
  const { id } = await params;
  const supplier = await requireSupplierOrRedirect(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar proveedor"
        description="Mantén limpia la base de compras del taller."
        status="Sprint 11"
      />

      {canManage ? (
        <SupplierForm
          supplierId={supplier.id}
          mode="edit"
          initialValues={buildSupplierFormDefaults({
            name: supplier.name,
            phone: supplier.phone,
            notes: supplier.notes,
          })}
        />
      ) : (
        <>
          <PermissionBanner
            title="Edicion reservada"
            description="La interfaz ya reconoce permisos por rol. En este sprint la edicion queda visible como placeholder para owner y admin."
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
