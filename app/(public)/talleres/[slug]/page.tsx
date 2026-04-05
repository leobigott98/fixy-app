import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Clock3,
  ImagePlus,
  Mail,
  MapPin,
  MessageCircleMore,
  PhoneCall,
  ShieldCheck,
  Star,
  Wrench,
} from "lucide-react";

import { WorkshopInquiryForm } from "@/components/marketplace/workshop-inquiry-form";
import { WorkshopReviewForm } from "@/components/marketplace/workshop-review-form";
import { PublicShell } from "@/components/public/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMarketplaceWorkshopDetailBySlug } from "@/lib/data/marketplace";
import { buildWhatsAppHref } from "@/lib/whatsapp";

type PublicWorkshopPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    service?: string | string[];
  }>;
};

function getFirstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getContactHref(phone: string | null | undefined) {
  if (!phone) {
    return null;
  }

  return `tel:${phone.replace(/\s+/g, "")}`;
}

function getVerificationCopy(status: "not_requested" | "pending" | "verified") {
  switch (status) {
    case "verified":
      return {
        title: "Perfil verificado",
        description: "El taller ya tiene una señal visible de confianza dentro de Fixy.",
      };
    case "pending":
      return {
        title: "Verificacion pendiente",
        description: "La ficha publica esta preparada para una validacion mas fuerte muy pronto.",
      };
    default:
      return {
        title: "Base de confianza activa",
        description: "Fixy ya muestra identidad, horarios y contacto directo aunque la verificacion formal aun no este activa.",
      };
  }
}

function formatFixySince(dateValue: string) {
  return new Date(dateValue).toLocaleDateString("es-VE", {
    month: "long",
    year: "numeric",
  });
}

export async function generateMetadata({
  params,
}: PublicWorkshopPageProps): Promise<Metadata> {
  const { slug } = await params;
  const workshop = await getMarketplaceWorkshopDetailBySlug(slug);

  if (!workshop) {
    return {
      title: "Taller | Fixy",
    };
  }

  return {
    title: `${workshop.workshop_name} | Fixy`,
    description:
      workshop.public_description ||
      `${workshop.workshop_name} en ${workshop.city}. Servicios, contacto y solicitud directa desde Fixy.`,
  };
}

export default async function PublicWorkshopPage({
  params,
  searchParams,
}: PublicWorkshopPageProps) {
  const { slug } = await params;
  const currentSearchParams = await searchParams;
  const workshop = await getMarketplaceWorkshopDetailBySlug(slug);

  if (!workshop) {
    notFound();
  }

  const visiblePhone = workshop.public_contact_phone || workshop.whatsapp_phone;
  const contactHref = getContactHref(visiblePhone);
  const whatsappHref = buildWhatsAppHref(
    visiblePhone,
    `Hola ${workshop.workshop_name}, vi su perfil en Fixy y quiero consultar por un servicio.`,
  );
  const verification = getVerificationCopy(workshop.verification_status);
  const services = workshop.public_services?.length
    ? workshop.public_services
    : [workshop.workshop_type];
  const galleryImages = workshop.gallery_image_urls ?? [];
  const defaultService = getFirstParam(currentSearchParams.service) || services[0];

  return (
    <PublicShell
      actions={
        <>
          <Button asChild size="lg" variant="outline">
            <Link href="/talleres">
              <ArrowLeft className="size-4" />
              Volver al directorio
            </Link>
          </Button>
          {contactHref ? (
            <Button asChild size="lg" variant="primary">
              <a href={contactHref}>
                <PhoneCall className="size-4" />
                Contactar taller
              </a>
            </Button>
          ) : null}
          {whatsappHref ? (
            <Button asChild size="lg" variant="secondary">
              <a href={whatsappHref} rel="noreferrer" target="_blank">
                <MessageCircleMore className="size-4" />
                Escribir por WhatsApp
              </a>
            </Button>
          ) : null}
        </>
      }
      badge="Detalle del taller"
      subtitle={
        workshop.public_description ||
        `Taller ${workshop.workshop_type.toLowerCase()} en ${workshop.city}, con foco en confianza y respuesta directa.`
      }
      title={workshop.workshop_name}
      workshop={{
        name: workshop.workshop_name,
        city: workshop.city,
        phone: visiblePhone || "Contacto por habilitar",
        logoUrl: workshop.logo_url,
      }}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          icon={<Wrench className="size-4" />}
          label="Servicios visibles"
          value={`${services.length}`}
          helper="Oferta publica inicial"
        />
        <MetricCard
          icon={<Clock3 className="size-4" />}
          label="Horario"
          value={workshop.opening_hours_label}
          helper="Operacion informada"
        />
        <MetricCard
          icon={<ShieldCheck className="size-4" />}
          label="Confianza"
          value={verification.title}
          helper="Trust first"
        />
        <MetricCard
          icon={<Star className="size-4" />}
          label="Resenas"
          value={
            workshop.reviewSummary.totalApproved
              ? `${workshop.reviewSummary.averageRating} / 5`
              : "Fundacion activa"
          }
          helper={
            workshop.reviewSummary.totalApproved
              ? `${workshop.reviewSummary.totalApproved} visibles`
              : "Espacio listo para reputacion"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="bg-white/92">
          <CardContent className="space-y-4 px-5 py-5">
            <div className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]">
                <Wrench className="size-4" />
              </div>
              <div>
                <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                  Servicios y especialidad
                </div>
                <div className="text-sm text-[var(--muted)]">
                  Lo esencial para que un conductor entienda si este taller encaja.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {services.map((service) => (
                <Badge key={service} variant="primary">
                  {service}
                </Badge>
              ))}
            </div>
            <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6 text-[var(--muted)]">
              {workshop.public_description ||
                `${workshop.workshop_name} usa Fixy para mostrar informacion clara y generar leads directos.`}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TrustSignal
                icon={<ShieldCheck className="size-4" />}
                title={verification.title}
                text={verification.description}
              />
              <TrustSignal
                icon={<Clock3 className="size-4" />}
                title="Horario publicado"
                text="El conductor puede ver cuando opera el taller antes de escribir."
              />
              <TrustSignal
                icon={<PhoneCall className="size-4" />}
                title="Contacto directo"
                text="Telefono y WhatsApp visibles para acelerar la conversion a lead."
              />
              <TrustSignal
                icon={<MapPin className="size-4" />}
                title="En Fixy desde"
                text={formatFixySince(workshop.created_at)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/92">
          <CardContent className="space-y-4 px-5 py-5">
            <div className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(15,118,110,0.12)] text-[var(--secondary)]">
                <MapPin className="size-4" />
              </div>
              <div>
                <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                  Ubicacion y contacto
                </div>
                <div className="text-sm text-[var(--muted)]">
                  Informacion lista para una consulta real desde el celular.
                </div>
              </div>
            </div>
            <InfoRow icon={<MapPin className="size-4" />} label="Ciudad" value={workshop.city} />
            <InfoRow
              icon={<MapPin className="size-4" />}
              label="Direccion"
              value={workshop.public_address || "Referencia visible por cargar"}
            />
            <InfoRow
              icon={<PhoneCall className="size-4" />}
              label="Telefono"
              value={visiblePhone || "Telefono por habilitar"}
            />
            {workshop.public_contact_email ? (
              <InfoRow
                icon={<Mail className="size-4" />}
                label="Correo"
                value={workshop.public_contact_email}
              />
            ) : null}
            <InfoRow
              icon={<Clock3 className="size-4" />}
              label="Horario"
              value={workshop.opening_hours_label}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
        <WorkshopInquiryForm
          defaultService={defaultService}
          workshopName={workshop.workshop_name}
          workshopSlug={workshop.public_slug || workshop.workshop_name}
        />

        <Card className="bg-white/92">
          <CardContent className="space-y-4 px-5 py-5">
            <div className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(21,28,35,0.08)] text-[var(--foreground)]">
                <Star className="size-4" />
              </div>
              <div>
                <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                  Resenas y reputacion
                </div>
                <div className="text-sm text-[var(--muted)]">
                  Foundation lista para reviews reales sin activar todavia una capa compleja.
                </div>
              </div>
            </div>

            {workshop.recentReviews.length ? (
              <div className="space-y-3">
                {workshop.recentReviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{review.title}</div>
                        <div className="mt-1 text-xs text-[var(--muted)]">{review.reviewerName}</div>
                      </div>
                      <div className="text-sm text-[var(--muted)]">{`${review.rating} / 5`}</div>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {review.comment || "Opinion breve sin comentario adicional."}
                    </div>
                    {review.workshopResponse ? (
                      <div className="mt-3 rounded-[20px] border border-[rgba(15,118,110,0.14)] bg-[rgba(15,118,110,0.08)] p-3">
                        <div className="text-sm font-medium text-[var(--secondary)]">
                          Respuesta del taller
                        </div>
                        <div className="mt-1 text-sm leading-6 text-[var(--foreground)]">
                          {review.workshopResponse}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4 text-sm leading-6 text-[var(--muted)]">
                Aun no hay resenas publicas visibles. La base ya existe para aprobar y mostrar
                reputacion mas adelante sin meter ranking ni marketplace pesado hoy.
              </div>
            )}

            <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
              <div className="font-medium">Indicadores de confianza disponibles ahora</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge>{verification.title}</Badge>
                <Badge>Horario publicado</Badge>
                <Badge>Solicitud directa</Badge>
                <Badge>WhatsApp visible</Badge>
                {workshop.reviewSummary.totalApproved ? (
                  <Badge variant="primary">{`${workshop.reviewSummary.totalApproved} resenas`}</Badge>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <WorkshopReviewForm
        workshopName={workshop.workshop_name}
        workshopSlug={workshop.public_slug || workshop.workshop_name}
      />

      <Card className="bg-white/92">
        <CardContent className="space-y-4 px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]">
              <ImagePlus className="size-4" />
            </div>
            <div>
              <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                Fotos del taller
              </div>
              <div className="text-sm text-[var(--muted)]">
                Imagenes reales para que el cliente vea el espacio antes de escribir.
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {galleryImages.length
              ? galleryImages.map((value) => (
                  <div
                    key={value}
                    className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.03)]"
                  >
                    <img
                      alt={`Foto de ${workshop.workshop_name}`}
                      className="h-44 w-full object-cover"
                      src={value}
                    />
                  </div>
                ))
              : ["Fachada", "Recepcion", "Zona tecnica", "Entrega"].map((item) => (
                  <div
                    key={item}
                    className="rounded-[24px] border border-dashed border-[var(--line)] bg-[rgba(21,28,35,0.03)] p-4"
                  >
                    <div className="font-medium">{item}</div>
                    <div className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      El taller aun no ha subido fotos. Este espacio ya esta listo para mostrarlas.
                    </div>
                  </div>
                ))}
          </div>
        </CardContent>
      </Card>
    </PublicShell>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card className="bg-white/92">
      <CardContent className="space-y-3 px-5 py-5">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]">
          {icon}
        </div>
        <div className="text-sm text-[var(--muted)]">{label}</div>
        <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
          {value}
        </div>
        <div className="text-sm leading-6 text-[var(--muted)]">{helper}</div>
      </CardContent>
    </Card>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
      <div className="mt-0.5 text-[var(--secondary)]">{icon}</div>
      <div>
        <div className="text-sm text-[var(--muted)]">{label}</div>
        <div className="mt-1 font-medium">{value}</div>
      </div>
    </div>
  );
}

function TrustSignal({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-white px-4 py-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="text-[var(--primary-strong)]">{icon}</span>
        {title}
      </div>
      <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{text}</div>
    </div>
  );
}
