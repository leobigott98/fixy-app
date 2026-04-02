import { PageHeader } from "@/components/shared/page-header";
import { MechanicForm } from "@/components/mechanics/mechanic-form";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { buildMechanicFormDefaults } from "@/lib/mechanics/schema";

export default async function NewMechanicPage() {
  await requireCurrentWorkshop();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo integrante"
        description="Agrega mecanicos o apoyo operativo para asignar trabajo con claridad."
        status="Equipo"
      />
      <MechanicForm initialValues={buildMechanicFormDefaults()} mode="create" />
    </div>
  );
}
