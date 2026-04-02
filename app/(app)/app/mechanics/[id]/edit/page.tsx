import { PageHeader } from "@/components/shared/page-header";
import { MechanicForm } from "@/components/mechanics/mechanic-form";
import { getMechanicForEdit, requireMechanicOrRedirect } from "@/lib/data/mechanics";
import { buildMechanicFormDefaults } from "@/lib/mechanics/schema";

type EditMechanicPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditMechanicPage({ params }: EditMechanicPageProps) {
  const { id } = await params;
  await requireMechanicOrRedirect(id);
  const mechanic = await getMechanicForEdit(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar ${mechanic.full_name}`}
        description="Actualiza el perfil sin perder contexto de asignacion."
        status="Equipo"
      />
      <MechanicForm
        initialValues={buildMechanicFormDefaults({
          fullName: mechanic.full_name,
          phone: mechanic.phone,
          role: mechanic.role as never,
          isActive: mechanic.is_active,
          notes: mechanic.notes,
          photoUrl: mechanic.photo_url,
        })}
        mechanicId={mechanic.id}
        mode="edit"
      />
    </div>
  );
}
