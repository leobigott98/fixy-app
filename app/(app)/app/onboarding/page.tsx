import { redirect } from "next/navigation";
import { ArrowRight, MapPin, Store } from "lucide-react";

import { WorkshopProfileForm } from "@/components/workshops/workshop-profile-form";
import { FixyLogo } from "@/components/brand/fixy-logo";
import { OnboardingExitActions } from "@/components/auth/onboarding-exit-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAppSession } from "@/lib/auth/session";
import { getCurrentWorkshop } from "@/lib/data/workshops";
import { getDisplayNameFromIdentifier } from "@/lib/auth/session-utils";
import type { WorkshopProfileInput } from "@/lib/workshops/schema";

type OnboardingPageProps = {
  searchParams: Promise<{
    ownerName?: string | string[];
    workshopName?: string | string[];
  }>;
};

function getFirstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const session = await getAppSession();
  const workshop = await getCurrentWorkshop();

  if (!session) {
    redirect("/login");
  }

  if (workshop) {
    redirect("/app/dashboard");
  }

  const params = await searchParams;
  const initialValues: WorkshopProfileInput = {
    workshopName: getFirstParam(params.workshopName) ?? "",
    ownerName:
      getFirstParam(params.ownerName) ??
      getDisplayNameFromIdentifier(session.user.email ?? session.user.loginIdentifier),
    whatsappPhone: "",
    city: "",
    workshopType: "Mecanica general",
    openingDays: "Lunes a sabado",
    opensAt: "08:00",
    closesAt: "17:00",
    bayCount: 2,
    logoUrl: "",
    galleryImageUrls: [],
    currencyDisplay: "USD",
    publicDescription: "",
    publicAddress: "",
    publicContactPhone: "",
    publicContactEmail: "",
    publicSlug: "",
    publicServices: ["Diagnostico general", "Mantenimiento preventivo"],
    profileVisibility: "private",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 rounded-[32px] border border-[var(--line)] bg-white/80 p-5 shadow-[0_18px_50px_rgba(21,28,35,0.08)] sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <FixyLogo />
          <Badge variant="primary">Workshop setup</Badge>
          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight sm:text-4xl">
              Activa tu taller en Fixy
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
              Completa la identidad operativa del taller para entrar a un dashboard claro, movil y
              listo para clientes, vehiculos, presupuestos, ordenes y una futura ficha publica.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <OnboardingExitActions />
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: <Store className="size-4" />,
                title: "Base del taller",
                text: "Nombre, capacidad y horario listos.",
              },
              {
                icon: <MapPin className="size-4" />,
                title: "Contexto local",
                text: "Ciudad, WhatsApp y moneda adaptados.",
              },
              {
                icon: <Store className="size-4" />,
                title: "Perfil publico base",
                text: "Servicios, slug y contacto listos para publicar despues.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[24px] border border-[var(--line)] bg-[rgba(249,115,22,0.05)] p-4">
                <div className="flex items-center gap-2 text-[var(--primary-strong)]">
                  {item.icon}
                  <span className="text-sm font-semibold">{item.title}</span>
                </div>
                <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.text}</div>
              </div>
            ))}
            <Button variant="outline" className="sm:col-span-3" disabled>
              Siguiente: dashboard operativo
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <WorkshopProfileForm initialValues={initialValues} mode="onboarding" />
    </div>
  );
}
