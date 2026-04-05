import { Bell, MapPin, MessageCircleMore, PhoneCall, Wrench } from "lucide-react";

import { markMarketplaceInquiryAsContactedAction } from "@/app/actions/marketplace";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getWorkshopNotifications } from "@/lib/data/marketplace";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { buildWhatsAppHref } from "@/lib/whatsapp";

function formatCreatedAt(value: string) {
  return new Date(value).toLocaleString("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getContactHref(phone: string) {
  return `tel:${phone.replace(/\s+/g, "")}`;
}

export default async function NotificationsPage() {
  const workshop = await requireCurrentWorkshop();
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
        <SummaryCard
          label="Total recibidas"
          value={String(notifications.length)}
        />
      </div>

      <div className="space-y-4">
        {notifications.length ? (
          notifications.map((item) => {
            const whatsappHref = buildWhatsAppHref(
              item.requesterPhone,
              `Hola ${item.requesterName}, te escribe ${workshop.workshop_name} desde Fixy sobre tu solicitud de ${item.requestedService}.`,
            );
            const markAction = markMarketplaceInquiryAsContactedAction.bind(null, item.id);

            return (
              <Card key={item.id} className="bg-white/88">
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

                  <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                    <div className="text-sm text-[var(--muted)]">Mensaje</div>
                    <div className="mt-2 text-sm leading-6 text-[var(--foreground)]">{item.message}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })
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
  icon: React.ReactNode;
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
