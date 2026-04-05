import type { Route } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Clock3, MapPin, MessageCircleMore, ShieldCheck, Star, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MarketplaceWorkshopListItem } from "@/lib/data/marketplace";
import { buildWorkshopPublicPath } from "@/lib/workshops/schema";
import { buildWhatsAppHref } from "@/lib/whatsapp";

function getTrustLabel(workshop: MarketplaceWorkshopListItem) {
  if (workshop.verification_status === "verified") {
    return "Perfil verificado";
  }

  if (workshop.verification_status === "pending") {
    return "Verificacion pendiente";
  }

  return "Perfil operativo en Fixy";
}

export function WorkshopListingCard({ workshop }: { workshop: MarketplaceWorkshopListItem }) {
  const profileHref = buildWorkshopPublicPath(workshop.public_slug || workshop.workshop_name);
  const inquiryHref = `${profileHref}#solicitar`;
  const visiblePhone = workshop.public_contact_phone || workshop.whatsapp_phone;
  const whatsappHref = buildWhatsAppHref(
    visiblePhone,
    `Hola ${workshop.workshop_name}, vi su perfil en Fixy y quiero consultar por un servicio.`,
  );
  const visibleServices = workshop.public_services?.length
    ? workshop.public_services.slice(0, 4)
    : [workshop.workshop_type];

  return (
    <Card className="overflow-hidden border border-[var(--line)] bg-white/90">
      <CardContent className="space-y-5 px-5 py-5">
        <div className="flex items-start gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-[var(--line)] bg-[rgba(21,28,35,0.04)]">
            {workshop.logo_url ? (
              <img
                alt={`Logo de ${workshop.workshop_name}`}
                className="size-full object-cover"
                src={workshop.logo_url}
              />
            ) : (
              <span className="font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight">
                {workshop.workshop_name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                {workshop.workshop_name}
              </div>
              <Badge variant="primary">{workshop.workshop_type}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-[var(--muted)]">
              <DirectoryTag icon={<MapPin className="size-3.5" />}>{workshop.city}</DirectoryTag>
              <DirectoryTag icon={<Clock3 className="size-3.5" />}>
                {workshop.opening_hours_label}
              </DirectoryTag>
            </div>
          </div>
        </div>

        <p className="text-sm leading-6 text-[var(--muted)]">
          {workshop.public_description ||
            `${workshop.workshop_name} ofrece una presencia clara y profesional para captar leads desde Fixy.`}
        </p>

        <div className="flex flex-wrap gap-2">
          {visibleServices.map((service) => (
            <Badge key={service}>{service}</Badge>
          ))}
        </div>

        <div className="grid gap-3 rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 sm:grid-cols-3">
          <TrustBox
            icon={<ShieldCheck className="size-4" />}
            label="Confianza"
            value={getTrustLabel(workshop)}
          />
          <TrustBox
            icon={<Star className="size-4" />}
            label="Resenas"
            value={
              workshop.reviewSummary.totalApproved
                ? `${workshop.reviewSummary.averageRating} / 5`
                : "Base de resenas activa"
            }
          />
          <TrustBox
            icon={<Wrench className="size-4" />}
            label="Servicios"
            value={`${visibleServices.length} visibles`}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="sm:flex-1" variant="primary">
            <Link href={profileHref as Route}>Ver detalle</Link>
          </Button>
          <Button asChild className="sm:flex-1" variant="outline">
            <Link href={inquiryHref as Route}>Solicitar atencion</Link>
          </Button>
          <Button asChild className="sm:flex-1" variant="secondary">
            <a href={whatsappHref ?? profileHref} rel="noreferrer" target={whatsappHref ? "_blank" : undefined}>
              <MessageCircleMore className="size-4" />
              WhatsApp
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DirectoryTag({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1.5">
      {icon}
      <span>{children}</span>
    </div>
  );
}

function TrustBox({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] bg-white px-3 py-3">
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
        <span className="text-[var(--primary-strong)]">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{value}</div>
    </div>
  );
}
