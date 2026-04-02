import { ArrowUpRight, Clock3, MessageCircleMore } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardCards, dashboardQuickActions } from "@/lib/modules";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Vista inicial para operar el taller con foco en presupuestos, ordenes activas y cobros pendientes."
        status="Operativo"
        action={{ label: "Nueva accion rapida", icon: <ArrowUpRight className="size-4" /> }}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {dashboardCards.map((card) => (
          <Card key={card.label} className="bg-white/82">
            <CardContent className="space-y-3 px-5 py-5">
              <div className="text-sm text-[var(--muted)]">{card.label}</div>
              <div className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight">
                {card.value}
              </div>
              <div className="text-sm text-[var(--muted)]">{card.helper}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="bg-white/84">
          <CardHeader>
            <CardTitle>Acciones rapidas</CardTitle>
            <CardDescription>
              El dashboard arranca pensando en lo que mas mueve el dia del taller.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {dashboardQuickActions.map((action) => {
              const Icon = action.icon;

              return (
                <div
                  key={action.title}
                  className="rounded-[24px] border border-[var(--line)] bg-[rgba(249,115,22,0.05)] p-4"
                >
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-[var(--primary-strong)]">
                    <Icon className="size-5" />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="font-semibold">{action.title}</div>
                    <p className="text-sm leading-6 text-[var(--muted)]">{action.description}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Hoy</Badge>
            <CardTitle className="text-white">Seguimiento del taller</CardTitle>
            <CardDescription className="text-white/72">
              En Sprint 1 esta columna puede convertirse en feed real de ordenes y alertas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                title: "Aveo 2012",
                description: "Cliente pidio actualizacion del trabajo",
                icon: MessageCircleMore,
              },
              {
                title: "Hilux 2018",
                description: "Esperando aprobacion del presupuesto",
                icon: Clock3,
              },
              {
                title: "Orinoco 2015",
                description: "Pago registrado, listo para entrega",
                icon: ArrowUpRight,
              },
            ].map((item) => {
              const ItemIcon = item.icon;

              return (
                <div key={item.title} className="rounded-3xl bg-white/8 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-white/10 p-2">
                      <ItemIcon className="size-4" />
                    </div>
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      <div className="mt-1 text-sm text-white/72">{item.description}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
