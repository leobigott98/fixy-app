import type { Route } from "next";
import Link from "next/link";
import { CreditCard, Globe, ShieldCheck, ShoppingCart, Truck, UsersRound } from "lucide-react";

import { PermissionBanner } from "@/components/shared/permission-banner";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WorkshopProfileForm } from "@/components/workshops/workshop-profile-form";
import { getCurrentWorkshopAccess, requireCurrentWorkshop } from "@/lib/data/workshops";
import { getRoleLabel, getRolePermissions, hasPermission } from "@/lib/permissions";
import { buildWorkshopPublicPath, type WorkshopProfileInput } from "@/lib/workshops/schema";

export default async function SettingsPage() {
  const workshop = await requireCurrentWorkshop();
  const access = await getCurrentWorkshopAccess();
  const role = access?.role ?? "mechanic";
  const permissions = getRolePermissions(role);
  const canManageWorkshop = hasPermission(role, "manage_workshop");
  const publicPath = workshop.public_slug ? buildWorkshopPublicPath(workshop.public_slug) : null;

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
    galleryImageUrls: workshop.gallery_image_urls ?? [],
    currencyDisplay: workshop.preferred_currency,
    publicDescription: workshop.public_description ?? "",
    publicAddress: workshop.public_address ?? "",
    publicContactPhone: workshop.public_contact_phone ?? "",
    publicContactEmail: workshop.public_contact_email ?? "",
    publicSlug: workshop.public_slug ?? "",
    publicServices: workshop.public_services?.length
      ? (workshop.public_services as WorkshopProfileInput["publicServices"])
      : ["Diagnostico general", "Mantenimiento preventivo"],
    profileVisibility: workshop.profile_visibility,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfil del taller"
        description="Edita la informacion principal del taller y prepara la ficha publica que servira como base para discovery mas adelante."
        status="Configuracion"
      />

      {!canManageWorkshop ? (
        <PermissionBanner
          title={`Vista de ${getRoleLabel(role)}`}
          description="La base de roles ya esta activa. En este sprint la edicion sensible del taller queda reservada para owner."
          tone="warning"
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="bg-white/84">
          <CardContent className="space-y-3 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[rgba(15,118,110,0.12)] text-[var(--secondary)]">
                <Globe className="size-5" />
              </div>
              <div>
                <div className="text-sm text-[var(--muted)]">Perfil publico</div>
                <div className="font-medium">
                  {workshop.profile_visibility === "public" ? "Visible" : "Privado"}
                </div>
              </div>
            </div>
            <p className="text-sm leading-6 text-[var(--muted)]">
              {publicPath
                ? `Ruta preparada: ${publicPath}`
                : "El slug se genera al guardar la configuracion publica."}
            </p>
            {workshop.profile_visibility === "public" && publicPath ? (
              <Button asChild size="sm" variant="outline">
                <Link href={publicPath as Route} target="_blank">
                  Abrir perfil
                </Link>
              </Button>
            ) : (
              <Badge>solo visible internamente</Badge>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/84">
          <CardContent className="space-y-3 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <div className="text-sm text-[var(--muted)]">Rol actual</div>
                <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                  {getRoleLabel(role)}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {permissions.length ? (
                permissions.map((permission) => (
                  <Badge key={permission}>{permission.replaceAll("_", " ")}</Badge>
                ))
              ) : (
                <Badge>solo lectura base</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/84">
          <CardContent className="space-y-3 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[rgba(15,118,110,0.12)] text-[var(--secondary)]">
                <UsersRound className="size-5" />
              </div>
              <div>
                <div className="text-sm text-[var(--muted)]">Base de roles</div>
                <div className="font-medium">owner, admin y mechanic</div>
              </div>
            </div>
            <p className="text-sm leading-6 text-[var(--muted)]">
              Suficiente para mostrar permisos por interfaz hoy y crecer a accesos reales despues.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/84">
          <CardContent className="space-y-3 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[rgba(21,28,35,0.08)] text-[var(--foreground)]">
                <CreditCard className="size-5" />
              </div>
              <div>
                <div className="text-sm text-[var(--muted)]">Comisiones</div>
                <div className="font-medium">Base de datos lista</div>
              </div>
            </div>
            <p className="text-sm leading-6 text-[var(--muted)]">
              La tabla ya existe para futuras reglas por mecanico y orden, sin activar todavia el flujo completo.
            </p>
          </CardContent>
        </Card>
      </div>

      {canManageWorkshop ? (
        <WorkshopProfileForm initialValues={initialValues} mode="settings" />
      ) : (
        <Card className="bg-white/84">
          <CardContent className="grid gap-4 px-5 py-5 sm:grid-cols-2 xl:grid-cols-4">
            <ReadOnlyField label="Taller" value={workshop.workshop_name} />
            <ReadOnlyField label="Encargado" value={workshop.owner_name} />
            <ReadOnlyField label="WhatsApp" value={workshop.whatsapp_phone} />
            <ReadOnlyField label="Ciudad" value={workshop.city} />
            <ReadOnlyField
              label="Perfil publico"
              value={workshop.profile_visibility === "public" ? "Visible" : "Privado"}
            />
            <ReadOnlyField label="Slug" value={workshop.public_slug ?? "Se genera al publicar"} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="bg-white/84">
          <CardContent className="space-y-4 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                  Modulos de defensa
                </div>
                <div className="text-sm text-[var(--muted)]">
                  Proveedores, compras y reportes ya tienen base real.
                </div>
              </div>
              <Badge variant="primary">Sprint 11</Badge>
            </div>
            <div className="grid gap-3">
              {[
                {
                  href: "/app/suppliers",
                  icon: <Truck className="size-4" />,
                  title: "Proveedores",
                  text: "Agenda ligera para sostener compras e inventario.",
                },
                {
                  href: "/app/purchase-orders",
                  icon: <ShoppingCart className="size-4" />,
                  title: "Compras",
                  text: "Ordenes de compra basicas para reposicion y seguimiento.",
                },
              ].map((item) => (
                <div key={item.href} className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                  <div className="flex gap-3">
                    <div className="mt-0.5 text-[var(--primary-strong)]">{item.icon}</div>
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-[var(--muted)]">{item.text}</div>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={item.href as Route}>Abrir</Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/84">
          <CardContent className="space-y-4 px-5 py-5">
            <div>
              <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                Reportes simples
              </div>
              <div className="text-sm text-[var(--muted)]">
                Visibilidad de negocio sin hacer que Fixy se sienta como software contable.
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6 text-[var(--muted)]">
              Activas, completadas, ingresos, saldos pendientes y bajo stock. Esa base es suficiente para owner/admin hoy y deja espacio para filtros, exportes y comisiones despues.
            </div>
            <Button asChild variant="primary">
              <Link href={"/app/reports" as Route}>Abrir reportes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div className="mt-2 font-medium">{value}</div>
    </div>
  );
}
