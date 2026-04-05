import type { Route } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Bell, CalendarCheck2, LayoutGrid, MapPin, MessageCircleMore, PhoneCall, TableProperties, Wrench } from "lucide-react";

import {
  confirmAndScheduleMarketplaceInquiryAction,
  markMarketplaceInquiryAsContactedAction,
} from "@/app/actions/marketplace";
import { PageHeader } from "@/components/shared/page-header";
import { ViewToggle } from "@/components/shared/view-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getWorkshopNotifications } from "@/lib/data/marketplace";
import { getCurrentWorkshopAccess, requireCurrentWorkshop } from "@/lib/data/workshops";
import { hasModuleAccess } from "@/lib/permissions";
import { getPreferredListView } from "@/lib/view-preferences";
import { buildAppointmentConfirmationMessage, buildWhatsAppHref } from "@/lib/whatsapp";

type NotificationsPageProps = {
  searchParams: Promise<{
    view?: string | string[];
  }>;
};

function getQueryValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function buildViewHref(view: "cards" | "table") {
  return `/app/notifications?view=${view}` as Route;
}

function formatCreatedAt(value: string) {
  return new Date(value).toLocaleString("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getContactHref(phone: string) {
  return `tel:${phone.replace(/\s+/g, "")}`;
}

function buildConfirmationWhatsappHref(
  item: Awaited<ReturnType<typeof getWorkshopNotifications>>[number],
  workshopName: string,
) {
  if (!item.requestedDate || !item.requestedTime) {
    return buildWhatsAppHref(
      item.requesterPhone,
      `Hola ${item.requesterName}, te escribe ${workshopName} desde Fixy sobre tu solicitud de ${item.requestedService}.`,
    );
  }

  return buildWhatsAppHref(
    item.requesterPhone,
    buildAppointmentConfirmationMessage({
      clientName: item.requesterName,
      workshopName,
      vehicleSummary: item.vehicleReference || "tu vehiculo",
      appointmentDate: item.requestedDate,
      appointmentTime: item.requestedTime,
      serviceNeeded: item.requestedService,
    }),
  );
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const workshop = await requireCurrentWorkshop();
  const access = await getCurrentWorkshopAccess();

  if (!hasModuleAccess(access?.role ?? "mechanic", "notifications")) {
    redirect("/app/dashboard");
  }

  const params = await searchParams;
  const view = await getPreferredListView(getQueryValue(params.view));
  const notifications = await getWorkshopNotifications(workshop.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitudes del marketplace"
        description="Aqui ves las consultas que llegan desde el directorio publico, con contacto directo y seguimiento ligero para convertirlas en trabajo real."
        status="Notificaciones"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Solicitudes nuevas"
          tone="primary"
          value={String(notifications.filter((item) => item.status === "new").length)}
        />
        <SummaryCard
          label="Contactadas"
          tone="success"
          value={String(notifications.filter((item) => item.status === "contacted").length)}
        />
        <SummaryCard label="Total recibidas" value={String(notifications.length)} />
      </div>

      <div className="flex justify-end">
        <ViewToggle
          options={[
            {
              href: buildViewHref("cards"),
              label: "Cards",
              icon: <LayoutGrid className="size-4" />,
              active: view === "cards",
            },
            {
              href: buildViewHref("table"),
              label: "Tabla",
              icon: <TableProperties className="size-4" />,
              active: view === "table",
            },
          ]}
        />
      </div>

      <div className="space-y-4">
        {notifications.length ? (
          view === "table" ? (
            <Card className="bg-white/88">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-[rgba(21,28,35,0.04)] text-left text-[var(--muted)]">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Cliente</th>
                        <th className="px-5 py-4 font-semibold">Servicio</th>
                        <th className="px-5 py-4 font-semibold">Ubicacion</th>
                        <th className="px-5 py-4 font-semibold">Estado</th>
                        <th className="px-5 py-4 font-semibold">Fecha</th>
                        <th className="px-5 py-4 font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notifications.map((item) => (
                        <NotificationTableRow
                          key={item.id}
                          requesterPhone={item.requesterPhone}
                          requesterPhoneHref={getContactHref(item.requesterPhone)}
                          status={item.status}
                          whatsappHref={buildConfirmationWhatsappHref(item, workshop.workshop_name)}
                          workshopName={workshop.workshop_name}
                          item={item}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            notifications.map((item) => (
              <NotificationCard
                key={item.id}
                workshopName={workshop.workshop_name}
                item={item}
              />
            ))
          )
        ) : (
          <Card className="bg-white/88">
            <CardContent className="space-y-3 px-5 py-8 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-[20px] bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]">
                <Bell className="size-6" />
              </div>
              <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                Aun no tienes solicitudes publicas
              </div>
              <div className="mx-auto max-w-xl text-sm leading-6 text-[var(--muted)]">
                Cuando un conductor envie una consulta desde el directorio, aparecera aqui con
                sus datos de contacto y un acceso rapido a WhatsApp.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function NotificationCard({
  item,
  workshopName,
}: {
  item: Awaited<ReturnType<typeof getWorkshopNotifications>>[number];
  workshopName: string;
}) {
  const whatsappHref = buildConfirmationWhatsappHref(item, workshopName);
  const markAction = markMarketplaceInquiryAsContactedAction.bind(null, item.id);
  const confirmAndScheduleAction = confirmAndScheduleMarketplaceInquiryAction.bind(null, item.id);

  return (
    <Card className="bg-white/88">
      <CardContent className="space-y-4 px-5 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                {item.requesterName}
              </div>
              <Badge variant={item.status === "new" ? "primary" : "success"}>
                {item.status === "new" ? "Nueva" : item.status === "contacted" ? "Contactada" : "Cerrada"}
              </Badge>
              <Badge>{item.requestedService}</Badge>
            </div>
            <div className="text-sm text-[var(--muted)]">{formatCreatedAt(item.createdAt)}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={getContactHref(item.requesterPhone)}>
                <PhoneCall className="size-4" />
                Llamar
              </a>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <a href={whatsappHref ?? getContactHref(item.requesterPhone)} rel="noreferrer" target={whatsappHref ? "_blank" : undefined}>
                <MessageCircleMore className="size-4" />
                WhatsApp
              </a>
            </Button>
            {item.status === "new" ? (
              <form action={markAction}>
                <Button size="sm" type="submit" variant="primary">
                  Marcar contactada
                </Button>
              </form>
            ) : null}
            {item.canConfirmAndSchedule ? (
              <form action={confirmAndScheduleAction}>
                <Button size="sm" type="submit" variant="secondary">
                  <CalendarCheck2 className="size-4" />
                  Confirmar y agendar
                </Button>
              </form>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <InfoBox icon={<PhoneCall className="size-4" />} label="Telefono" value={item.requesterPhone} />
          <InfoBox
            icon={<MapPin className="size-4" />}
            label="Ubicacion"
            value={item.requesterCity || "No especificada"}
          />
          <InfoBox
            icon={<Wrench className="size-4" />}
            label="Vehiculo"
            value={item.vehicleReference || "No especificado"}
          />
        </div>

        {item.requestedDate && item.requestedTime ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant="primary">{item.requestedDate}</Badge>
            <Badge>{item.requestedTime}</Badge>
            {item.ownerAppointmentStatus ? <Badge variant="success">{item.ownerAppointmentStatus}</Badge> : null}
          </div>
        ) : null}

        <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
          <div className="text-sm text-[var(--muted)]">Mensaje</div>
          <div className="mt-2 text-sm leading-6 text-[var(--foreground)]">{item.message}</div>
        </div>

        {item.workshopResponseNote ? (
          <div className="rounded-[24px] border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] p-4 text-sm leading-6 text-[var(--foreground)]">
            {item.workshopResponseNote}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function NotificationTableRow({
  item,
  requesterPhone,
  requesterPhoneHref,
  whatsappHref,
  status,
  workshopName,
}: {
  item: Awaited<ReturnType<typeof getWorkshopNotifications>>[number];
  requesterPhone: string;
  requesterPhoneHref: string;
  whatsappHref: string | null;
  status: "new" | "contacted" | "closed";
  workshopName: string;
}) {
  const markAction = markMarketplaceInquiryAsContactedAction.bind(null, item.id);
  const confirmAndScheduleAction = confirmAndScheduleMarketplaceInquiryAction.bind(null, item.id);

  return (
    <tr className="border-t border-[var(--line)] align-top">
      <td className="px-5 py-4">
        <div className="font-semibold">{item.requesterName}</div>
        <div className="mt-1 text-xs text-[var(--muted)]">{requesterPhone}</div>
      </td>
      <td className="px-5 py-4">{item.requestedService}</td>
      <td className="px-5 py-4">
        <div>{item.requesterCity || "No especificada"}</div>
        {item.requestedDate && item.requestedTime ? (
          <div className="mt-1 text-xs text-[var(--muted)]">{`${item.requestedDate} · ${item.requestedTime}`}</div>
        ) : null}
      </td>
      <td className="px-5 py-4">
        <Badge variant={status === "new" ? "primary" : "success"}>
          {status === "new" ? "Nueva" : status === "contacted" ? "Contactada" : "Cerrada"}
        </Badge>
      </td>
      <td className="px-5 py-4">{formatCreatedAt(item.createdAt)}</td>
      <td className="px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={requesterPhoneHref}>
              <PhoneCall className="size-4" />
              Llamar
            </a>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <a href={whatsappHref ?? requesterPhoneHref} rel="noreferrer" target={whatsappHref ? "_blank" : undefined}>
              <MessageCircleMore className="size-4" />
              WhatsApp
            </a>
          </Button>
          {status === "new" ? (
            <form action={markAction}>
              <Button size="sm" type="submit" variant="primary">
                Marcar
              </Button>
            </form>
          ) : null}
          {item.canConfirmAndSchedule ? (
            <form action={confirmAndScheduleAction}>
              <Button size="sm" type="submit" variant="secondary">
                <CalendarCheck2 className="size-4" />
                Confirmar
              </Button>
            </form>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "success";
}) {
  return (
    <Card className="bg-white/88">
      <CardContent className="space-y-2 px-5 py-5">
        <div className="text-sm text-[var(--muted)]">{label}</div>
        <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
          {value}
        </div>
        <Badge variant={tone === "default" ? undefined : tone}>{label}</Badge>
      </CardContent>
    </Card>
  );
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="text-[var(--primary-strong)]">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{value}</div>
    </div>
  );
}
