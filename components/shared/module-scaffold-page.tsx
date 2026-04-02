import { ArrowUpRight, CheckCircle2, Clock3 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Metric = {
  label: string;
  value: string;
  tone?: "default" | "primary" | "success";
};

type ModuleScaffoldPageProps = {
  title: string;
  description: string;
  actionLabel: string;
  metrics: ReadonlyArray<Metric>;
  quickActions: readonly string[];
  sprintOneNotes: readonly string[];
};

export function ModuleScaffoldPage({
  title,
  description,
  actionLabel,
  metrics,
  quickActions,
  sprintOneNotes,
}: ModuleScaffoldPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        status="Base Sprint 0"
        action={{ label: actionLabel, icon: <ArrowUpRight className="size-4" /> }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="bg-white/78">
            <CardContent className="space-y-2 px-5 py-5">
              <div className="text-sm text-[var(--muted)]">{metric.label}</div>
              <div className="flex items-center gap-3">
                <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                  {metric.value}
                </div>
                <Badge variant={metric.tone}>{metric.tone === "success" ? "Listo" : "Base"}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="bg-white/84">
          <CardHeader>
            <CardTitle>Flujo pensado para taller</CardTitle>
            <CardDescription>
              Esta pantalla ya existe con jerarquia visual, acciones rapidas y espacio claro para
              evolucionar sin reescribir la navegacion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <div
                key={action}
                className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[rgba(249,115,22,0.05)] px-4 py-3 text-sm"
              >
                <div className="font-medium">{action}</div>
                <ArrowUpRight className="size-4 text-[var(--primary-strong)]" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Sprint 1</Badge>
            <CardTitle className="text-white">Siguiente capa operativa</CardTitle>
            <CardDescription className="text-white/74">
              El scaffolding ya deja listo donde conectar estados reales, formularios y vistas
              accionables.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sprintOneNotes.map((note) => (
              <div key={note} className="flex gap-3 rounded-2xl bg-white/8 p-4 text-sm leading-6">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[rgba(255,255,255,0.92)]" />
                <span>{note}</span>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full border-white/14 bg-white/8 text-white hover:bg-white/12"
            >
              <Clock3 className="size-4" />
              Pendiente de datos reales
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
