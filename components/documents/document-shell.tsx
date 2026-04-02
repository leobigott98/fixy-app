import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DocumentShellProps = {
  badge: string;
  title: string;
  documentCode?: string | null;
  status?: string;
  workshop: {
    name: string;
    city: string;
    phone: string;
    ownerName: string;
    openingHours?: string | null;
    logoUrl?: string | null;
  };
  actions?: ReactNode;
  children: ReactNode;
};

export function DocumentShell({
  badge,
  title,
  documentCode,
  status,
  workshop,
  actions,
  children,
}: DocumentShellProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 print:max-w-none">
      <style>{`
        @media print {
          .fixy-document-actions {
            display: none !important;
          }

          body {
            background: white !important;
          }
        }
      `}</style>

      <div className="fixy-document-actions flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Badge variant="primary">{badge}</Badge>
          <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
            {title}
          </div>
          <div className="text-sm text-[var(--muted)]">
            Documento listo para imprimir o guardar como PDF.
          </div>
        </div>
        <div className="flex flex-wrap gap-3">{actions}</div>
      </div>

      <div className="overflow-hidden rounded-[32px] border border-[var(--line)] bg-white shadow-[0_24px_60px_rgba(21,28,35,0.08)]">
        <div className="grid gap-6 border-b border-[var(--line)] bg-[linear-gradient(135deg,rgba(249,115,22,0.08),rgba(21,28,35,0.02))] p-8 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              {workshop.logoUrl ? (
                <img
                  alt={`Logo de ${workshop.name}`}
                  className="h-16 w-16 rounded-[20px] border border-[var(--line)] bg-white object-cover p-2"
                  src={workshop.logoUrl}
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[var(--foreground)] font-[family-name:var(--font-heading)] text-xl font-bold text-white">
                  {workshop.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                  {workshop.name}
                </div>
                <div className="mt-1 text-sm text-[var(--muted)]">
                  {workshop.city} · {workshop.phone}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DocumentMeta label="Encargado" value={workshop.ownerName} />
              <DocumentMeta label="Horario" value={workshop.openingHours || "Horario no definido"} />
            </div>
          </div>

          <div className="space-y-3 rounded-[28px] border border-[var(--line)] bg-white/84 p-5">
            <div className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
              {badge}
            </div>
            <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
              {documentCode || "Sin codigo"}
            </div>
            {status ? (
              <div className="inline-flex w-fit rounded-full bg-[rgba(249,115,22,0.12)] px-3 py-1 text-xs font-semibold text-[var(--primary-strong)]">
                {status}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6 p-8">{children}</div>
      </div>
    </div>
  );
}

export function DocumentSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-4 rounded-[28px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-5",
        className,
      )}
    >
      <div>
        <div className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight">
          {title}
        </div>
        {description ? <div className="mt-1 text-sm text-[var(--muted)]">{description}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function DocumentInfoGrid({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <DocumentMeta key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

export function DocumentMeta({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-white/86 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
      <div className="mt-2 text-sm font-medium text-[var(--foreground)]">{value}</div>
    </div>
  );
}

export function DocumentItemsTable({
  items,
  currency,
  typeLabel,
}: {
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  currency: string;
  typeLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-[rgba(21,28,35,0.04)] text-left text-[var(--muted)]">
          <tr>
            <th className="px-4 py-3 font-semibold">{typeLabel}</th>
            <th className="px-4 py-3 font-semibold">Cant.</th>
            <th className="px-4 py-3 font-semibold">Precio</th>
            <th className="px-4 py-3 font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr className="border-t border-[var(--line)]" key={item.id}>
              <td className="px-4 py-3">{item.description}</td>
              <td className="px-4 py-3">{item.quantity}</td>
              <td className="px-4 py-3">
                {currency}
                {item.unit_price.toLocaleString("es-VE")}
              </td>
              <td className="px-4 py-3 font-semibold">
                {currency}
                {item.line_total.toLocaleString("es-VE")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
