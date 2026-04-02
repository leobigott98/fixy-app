import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type KpiCardProps = {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "primary" | "success";
};

export function KpiCard({ label, value, helper, tone = "default" }: KpiCardProps) {
  return (
    <Card className="bg-white/84">
      <CardContent className="space-y-3 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-[var(--muted)]">{label}</div>
          <Badge variant={tone}>{tone === "success" ? "OK" : tone === "primary" ? "Clave" : "Base"}</Badge>
        </div>
        <div className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight">
          {value}
        </div>
        <div className="text-sm leading-6 text-[var(--muted)]">{helper}</div>
      </CardContent>
    </Card>
  );
}
