import { PageHeader } from "@/components/shared/page-header";
import { OwnerProfileForm } from "@/components/car-owners/owner-profile-form";
import { buildOwnerProfileDefaults } from "@/lib/car-owners/schema";
import { requireCurrentCarOwnerProfile } from "@/lib/data/car-owners";

export default async function OwnerProfilePage() {
  const profile = await requireCurrentCarOwnerProfile();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi perfil"
        description="Ajusta tu identidad, ciudad y canal de contacto para que Fixy te sirva mejor cuando buscas taller o agendas una cita."
        status="Cuenta"
      />
      <OwnerProfileForm
        initialValues={buildOwnerProfileDefaults({
          fullName: profile.fullName,
          phone: profile.phone,
          city: profile.city ?? "",
          avatarUrl: profile.avatarUrl ?? "",
          preferredContact: profile.preferredContact,
        })}
        mode="settings"
      />
    </div>
  );
}
