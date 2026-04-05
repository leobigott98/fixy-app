import { ShieldAlert, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type PermissionBannerProps = {
  title: string;
  description: string;
  tone?: "info" | "warning";
};

export function PermissionBanner({
  title,
  description,
  tone = "info",
}: PermissionBannerProps) {
  const isWarning = tone === "warning";

  return (
    <Card className={isWarning ? "bg-[rgba(249,115,22,0.08)]" : "bg-white/84"}>
      <CardContent className="flex gap-4 px-5 py-5">
        <div
          className={
            isWarning
              ? "flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(249,115,22,0.14)] text-[var(--primary-strong)]"
              : "flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(15,118,110,0.12)] text-[var(--secondary)]"
          }
        >
          {isWarning ? <ShieldAlert className="size-5" /> : <ShieldCheck className="size-5" />}
        </div>
        <div className="space-y-2">
          <Badge variant={isWarning ? "primary" : "success"}>{title}</Badge>
          <p className="text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
