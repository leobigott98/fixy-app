import { WorkshopProfileForm } from "@/components/workshops/workshop-profile-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import type { WorkshopProfileInput } from "@/lib/workshops/schema";

export default async function SettingsPage() {
  const workshop = await requireCurrentWorkshop();

  const initialValues: WorkshopProfileInput = {
    workshopName: workshop.workshop_name,
    ownerName: workshop.owner_name,
    whatsappPhone: workshop.whatsapp_phone,
    city: workshop.city,
    workshopType: workshop.workshop_type as WorkshopProfileInput["workshopType"],
    openingDays: workshop.opening_days as WorkshopProfileInput["openingDays"],
    opensAt: workshop.opens_at.slice(0, 5),
    closesAt: workshop.closes_at.slice(0, 5),
    bayCount: workshop.bay_count,
    logoUrl: workshop.logo_url ?? "",
    currencyDisplay: workshop.preferred_currency,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfil del taller"
        description="Edita la informacion principal que alimenta dashboard, branding base y proximos modulos."
        status="Configuracion"
      />
      <WorkshopProfileForm initialValues={initialValues} mode="settings" />
    </div>
  );
}
