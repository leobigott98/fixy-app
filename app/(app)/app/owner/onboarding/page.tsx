import { PageHeader } from "@/components/shared/page-header";
import { OwnerProfileForm } from "@/components/car-owners/owner-profile-form";
import { buildOwnerProfileDefaults } from "@/lib/car-owners/schema";
import { getAppSession } from "@/lib/auth/session";
import { getCurrentCarOwnerProfile } from "@/lib/data/car-owners";

type OwnerOnboardingPageProps = {
  searchParams: Promise<{
    fullName?: string | string[];
    phone?: string | string[];
  }>;
};

function getFirstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OwnerOnboardingPage({ searchParams }: OwnerOnboardingPageProps) {
  const [session, profile, params] = await Promise.all([
    getAppSession(),
    getCurrentCarOwnerProfile(),
    searchParams,
  ]);

  const initialValues = buildOwnerProfileDefaults({
    fullName:
      profile?.fullName ??
      getFirstParam(params.fullName) ??
      session?.user.name ??
      "",
    phone:
      profile?.phone ??
      getFirstParam(params.phone) ??
      session?.user.phone ??
      "",
    city: profile?.city ?? "",
    avatarUrl: profile?.avatarUrl ?? "",
    preferredContact: profile?.preferredContact ?? "whatsapp",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activa tu perfil de conductor"
        description="Cierra tu onboarding con tu contacto principal y entra a un garage personal para carros, citas, talleres e historial."
        status="Propietario"
      />
      <OwnerProfileForm initialValues={initialValues} mode="onboarding" />
    </div>
  );
}
