import { Children, type ReactNode } from "react";

import { DocumentPrintButton } from "@/components/documents/document-print-button";
import { Button } from "@/components/ui/button";
import type {
  ClientQuoteProjection,
  InternalCostLine,
  InternalCostProjection,
  MechanicWorkOrderProjection,
  RepairCurrency,
} from "@/lib/documents/repair-documents";

function money(value: number, currency: RepairCurrency) {
  const resolved = currency === "VES" ? "VES" : "USD";
  return `${resolved} ${new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function date(value: string | null) {
  if (!value) return "Pendiente";
  return new Date(`${value.length === 10 ? `${value}T12:00:00` : value}`).toLocaleDateString("es-VE");
}

function cssContent(value: string) {
  return `"${value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, "\\A ")
    .replace(/</g, "\\3C ")
    .replace(/>/g, "\\3E ")}"`;
}

function RepairDocumentShell({
  accent = "teal",
  actions,
  audience,
  children,
  code,
  footer,
  status,
  title,
  version,
  workshop,
}: {
  accent?: "teal" | "amber";
  actions?: ReactNode;
  audience: string;
  children: ReactNode;
  code: string;
  footer: string;
  status?: string;
  title: string;
  version: number;
  workshop: ClientQuoteProjection["workshop"];
}) {
  const accentClass = accent === "amber" ? "text-[#a95818]" : "text-[#08756f]";
  const accentBg = accent === "amber" ? "bg-[#a95818]" : "bg-[#08756f]";
  const contentRows = Children.toArray(children);
  const workshopNameCss = cssContent(workshop.name);
  const workshopDetailsCss = cssContent(
    [workshop.address, workshop.city, workshop.phone, workshop.email, workshop.taxId ? `RIF: ${workshop.taxId}` : null]
      .filter(Boolean)
      .join(" · "),
  );
  const documentIdentityCss = cssContent(`${audience} · ${code} · v${version}${status ? ` · ${status}` : ""}`);
  const footerCss = cssContent(footer);

  return (
    <div className="repair-document-root mx-auto max-w-[210mm] space-y-4 text-[#1d2933] print:max-w-none print:space-y-0">
      <style>{`
        @page {
          size: A4;
          margin: 28mm 11mm 14mm;
          @top-left {
            content: ${workshopNameCss} "\\A" ${workshopDetailsCss};
            padding-bottom: 3mm;
            border-bottom: 2px solid ${accent === "amber" ? "#a95818" : "#08756f"};
            color: #1d2933;
            font-family: Arial, sans-serif;
            font-size: 9pt;
            font-weight: 700;
            line-height: 1.35;
            text-align: left;
            vertical-align: bottom;
            white-space: pre-wrap;
          }
          @top-center { content: ""; border-bottom: 2px solid ${accent === "amber" ? "#a95818" : "#08756f"}; }
          @top-right {
            content: ${documentIdentityCss};
            padding-bottom: 3mm;
            border-bottom: 2px solid ${accent === "amber" ? "#a95818" : "#08756f"};
            color: ${accent === "amber" ? "#a95818" : "#08756f"};
            font-family: Arial, sans-serif;
            font-size: 8pt;
            font-weight: 700;
            text-align: right;
            text-transform: uppercase;
            vertical-align: bottom;
          }
          @bottom-left {
            content: ${footerCss};
            padding-top: 2mm;
            border-top: 1px solid #d8e0e3;
            color: #687782;
            font-family: Arial, sans-serif;
            font-size: 7pt;
            text-align: left;
            vertical-align: top;
          }
          @bottom-center { content: ""; }
          @bottom-right {
            content: "Desarrollado con Fixy";
            padding-top: 2mm;
            border-top: 1px solid #d8e0e3;
            color: #687782;
            font-family: Arial, sans-serif;
            font-size: 7pt;
            text-align: right;
            vertical-align: top;
          }
        }
        @page :left {
          @top-left {
            content: ${workshopNameCss} "\\A" ${workshopDetailsCss};
            padding-bottom: 3mm;
            border-bottom: 2px solid ${accent === "amber" ? "#a95818" : "#08756f"};
            color: #1d2933;
            font-family: Arial, sans-serif;
            font-size: 9pt;
            font-weight: 700;
            line-height: 1.35;
            text-align: left;
            vertical-align: bottom;
            white-space: pre-wrap;
          }
          @top-center { content: ""; border-bottom: 2px solid ${accent === "amber" ? "#a95818" : "#08756f"}; }
          @top-right {
            content: ${documentIdentityCss};
            padding-bottom: 3mm;
            border-bottom: 2px solid ${accent === "amber" ? "#a95818" : "#08756f"};
            color: ${accent === "amber" ? "#a95818" : "#08756f"};
            font-family: Arial, sans-serif;
            font-size: 8pt;
            font-weight: 700;
            text-align: right;
            text-transform: uppercase;
            vertical-align: bottom;
          }
          @bottom-left {
            content: ${footerCss};
            padding-top: 2mm;
            border-top: 1px solid #d8e0e3;
            color: #687782;
            font-family: Arial, sans-serif;
            font-size: 7pt;
            text-align: left;
            vertical-align: top;
          }
          @bottom-center { content: ""; }
          @bottom-right {
            content: "Desarrollado con Fixy";
            padding-top: 2mm;
            border-top: 1px solid #d8e0e3;
            color: #687782;
            font-family: Arial, sans-serif;
            font-size: 7pt;
            text-align: right;
            vertical-align: top;
          }
        }
        @page :first {
          margin-top: 8mm;
          @top-left { content: ""; border: 0; }
          @top-center { content: ""; border: 0; }
          @top-right { content: ""; border: 0; }
          @bottom-left {
            content: ${footerCss};
            padding-top: 2mm;
            border-top: 1px solid #d8e0e3;
            color: #687782;
            font-family: Arial, sans-serif;
            font-size: 7pt;
            text-align: left;
            vertical-align: top;
          }
          @bottom-center { content: ""; }
          @bottom-right {
            content: "Desarrollado con Fixy";
            padding-top: 2mm;
            border-top: 1px solid #d8e0e3;
            color: #687782;
            font-family: Arial, sans-serif;
            font-size: 7pt;
            text-align: right;
            vertical-align: top;
          }
        }
        @media print {
          html, body { width: auto !important; margin: 0 !important; padding: 0 !important; background: white !important; }
          body { min-height: 0 !important; }
          .protected-app-shell { display: block !important; min-height: 0 !important; }
          .protected-app-sidebar, .protected-app-topbar, .protected-app-mobile-nav { display: none !important; }
          .protected-app-content { display: block !important; min-height: 0 !important; padding: 0 !important; }
          .protected-app-main { padding: 0 !important; }
          .repair-document-actions { display: none !important; }
          .repair-document-scroll { overflow: visible !important; padding: 0 !important; }
          .repair-document-root { width: 100% !important; max-width: none !important; margin: 0 !important; }
          .repair-document-page { width: 100% !important; min-width: 0 !important; margin: 0 !important; overflow: visible !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          .repair-document-page > table,
          .repair-document-page > table > tbody,
          .repair-document-page > table > tbody > tr,
          .repair-document-page > table > tbody > tr > td { display: block !important; width: 100% !important; }
          .repair-document-content { padding: 0 0 5mm !important; }
          .repair-document-content-first { padding-top: 0 !important; }
          .repair-document-page > table > thead,
          .repair-document-page > table > tfoot { display: none !important; }
          .repair-document-first-page-header { display: block !important; margin-bottom: 6mm; }
          .repair-document-row, .repair-document-block, .repair-document-block tr { break-inside: avoid; page-break-inside: avoid; }
          .repair-document-page img { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .repair-document-page, .repair-document-page * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div className="repair-document-first-page-header hidden">
        <div className={`h-2 ${accentBg}`} />
        <div className="flex items-start justify-between gap-6 border-b border-[#d8e0e3] py-4">
          <div className="flex min-w-0 items-center gap-4">
            {workshop.logoUrl ? (
              <img alt={`Logo de ${workshop.name}`} className="size-12 rounded-xl border border-[#d8e0e3] object-contain p-1" src={workshop.logoUrl} />
            ) : (
              <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${accentBg} text-base font-bold text-white`}>
                {workshop.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-lg font-extrabold tracking-wide">{workshop.name}</div>
              <div className="mt-1 text-[10px] text-[#687782]">
                {[workshop.address, workshop.city, workshop.phone, workshop.email].filter(Boolean).join(" · ")}
              </div>
              {workshop.taxId ? <div className="mt-1 text-[10px] text-[#687782]">RIF: {workshop.taxId}</div> : null}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className={`text-[9px] font-bold uppercase tracking-[0.16em] ${accentClass}`}>{audience}</div>
            <div className="mt-1 text-base font-extrabold">{code}</div>
            <div className="text-[10px] text-[#687782]">v{version}{status ? ` · ${status}` : ""}</div>
          </div>
        </div>
      </div>

      <div className="repair-document-actions flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-white/90 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-[var(--muted)]">Vista A4 lista para imprimir o guardar como PDF.</div>
        </div>
        <div className="flex flex-wrap gap-2">{actions}<DocumentPrintButton /></div>
      </div>

      <div className="repair-document-scroll overflow-x-auto pb-2 print:overflow-visible print:pb-0">
      <article className="repair-document-page min-w-[720px] overflow-hidden rounded-[8px] border border-[#d8e0e3] bg-white shadow-[0_20px_55px_rgba(21,28,35,0.10)] print:min-w-0">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <td className="repair-document-header-cell">
                <div className={`h-2 ${accentBg}`} />
                <div className="repair-document-header flex items-start justify-between gap-6 border-b border-[#d8e0e3] px-7 py-5">
                  <div className="flex min-w-0 items-center gap-4">
                    {workshop.logoUrl ? (
                      <img alt={`Logo de ${workshop.name}`} className="size-14 rounded-xl border border-[#d8e0e3] object-contain p-1" src={workshop.logoUrl} />
                    ) : (
                      <div className={`flex size-14 shrink-0 items-center justify-center rounded-xl ${accentBg} text-lg font-bold text-white`}>
                        {workshop.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-xl font-extrabold tracking-wide">{workshop.name}</div>
                      <div className="mt-1 text-xs text-[#687782]">
                        {[workshop.address, workshop.city, workshop.phone, workshop.email].filter(Boolean).join(" · ")}
                      </div>
                      {workshop.taxId ? <div className="mt-1 text-xs text-[#687782]">RIF: {workshop.taxId}</div> : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={`text-[10px] font-bold uppercase tracking-[0.16em] ${accentClass}`}>{audience}</div>
                    <div className="mt-1 text-lg font-extrabold">{code}</div>
                    <div className="text-xs text-[#687782]">v{version}{status ? ` · ${status}` : ""}</div>
                  </div>
                </div>
              </td>
            </tr>
          </thead>
          <tbody>
            {contentRows.map((child, index) => (
              <tr className="repair-document-row" key={index}>
                <td className={`repair-document-content px-7 pb-5 ${index === 0 ? "repair-document-content-first pt-6" : ""}`}>{child}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="repair-document-footer-cell">
                <div className="repair-document-footer mx-7 flex items-center justify-between border-t border-[#d8e0e3] py-3 text-[10px] text-[#687782]">
                  <span>{footer}</span><span>Desarrollado con Fixy</span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </article>
      </div>
    </div>
  );
}

function IdentityGrid({ document }: { document: ClientQuoteProjection | InternalCostProjection }) {
  return (
    <div className="grid gap-3 rounded-2xl bg-[#f2f5f5] p-4 sm:grid-cols-2">
      <div><Label>Vehículo</Label><Value>{document.vehicleLabel}{document.plate ? ` · Placa ${document.plate}` : ""}</Value>{document.mileage != null ? <Hint>{document.mileage.toLocaleString("es-VE")} km</Hint> : null}</div>
      <div><Label>Cliente</Label><Value>{document.clientName}</Value><Hint>Fecha: {date(document.date)}{document.validUntil ? ` · Vigente hasta ${date(document.validUntil)}` : ""}</Hint></div>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#687782]">{children}</div>;
}

function Value({ children }: { children: ReactNode }) {
  return <div className="mt-1 text-sm font-bold">{children}</div>;
}

function Hint({ children }: { children: ReactNode }) {
  return <div className="mt-1 text-xs text-[#687782]">{children}</div>;
}

function statusLabel(status: ClientQuoteProjection["status"]) {
  return ({ draft: "Borrador", sent: "Enviado", approved: "Aprobado", rejected: "Rechazado", expired: "Vencido" } as const)[status];
}

export function ClientQuoteDocument({ document, actions }: { document: ClientQuoteProjection; actions?: ReactNode }) {
  return (
    <RepairDocumentShell
      actions={actions}
      audience="Para el cliente"
      code={document.documentNumber}
      footer="Presupuesto informativo. No es un documento fiscal. La factura correspondiente la emite el taller por sus medios habilitados."
      status={statusLabel(document.status)}
      title={document.title}
      version={document.version}
      workshop={document.workshop}
    >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#08756f]">Presupuesto de reparación</div><h1 className="mt-1 text-3xl font-extrabold tracking-tight">{document.title}</h1></div>
          <div className="text-xs text-[#687782]">{document.documentNumber} · v{document.version}</div>
        </div>

        {document.isDraft ? <div className="rounded-xl border-2 border-dashed border-[#a95818] bg-[#fff6ed] px-4 py-3 text-center text-sm font-extrabold uppercase tracking-[0.14em] text-[#a95818]">Borrador · vista previa · no aprobado</div> : null}
        <IdentityGrid document={document} />
        <div className="flex items-center justify-between rounded-xl bg-[#e5f3f1] px-4 py-3 text-xs"><strong className="uppercase text-[#08756f]">{statusLabel(document.status)}</strong><span>{document.validUntil ? `Válido hasta ${date(document.validUntil)}` : "Vigencia no configurada"}</span></div>

        {document.groups.map((group, index) => (
          <section className="repair-document-block space-y-3" key={group.name}>
            <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-lg bg-[#08756f] font-bold text-white">{index + 1}</span><h2 className="text-lg font-extrabold">{group.name}</h2></div><strong className="text-[#08756f]">{money(group.saleTotal, document.currency)}</strong></div>
            <table className="w-full text-sm">
              <thead className="text-left text-[10px] uppercase tracking-wide text-[#687782]">
                <tr><th className="py-2">Concepto</th><th className="py-2 text-right">Cantidad</th><th className="py-2 text-right">Precio unit.</th><th className="py-2 text-right">Total</th></tr>
              </thead>
              <tbody>
                {[...group.parts, ...group.labor].map((line) => (
                  <tr className="border-b border-[#e3e8ea]" key={line.id}><td className="py-2 pr-3"><span className="mr-2 text-[10px] font-bold uppercase text-[#687782]">{line.kind === "part" ? "Repuesto" : "Mano de obra"}</span>{line.description}</td><td className="py-2 text-right tabular-nums">{line.quantity} {line.unit}</td><td className="py-2 text-right tabular-nums">{money(line.unitSalePrice, document.currency)}</td><td className="py-2 text-right font-semibold tabular-nums">{money(line.saleTotal, document.currency)}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        <section className="repair-document-block ml-auto max-w-xl rounded-2xl bg-[#f2f5f5] p-4 text-sm">
          <Summary label="Materiales" value={money(document.summary.materialsSubtotal, document.currency)} />
          <Summary label="Mano de obra" value={money(document.summary.laborSubtotal, document.currency)} />
          <Summary label="Subtotal" value={money(document.summary.subtotal, document.currency)} />
          {document.summary.discountAmount > 0 ? <Summary label="Descuento" value={`- ${money(document.summary.discountAmount, document.currency)}`} /> : null}
          <Summary label="Base" value={money(document.summary.taxableBase, document.currency)} />
          {document.summary.taxStatus === "applied" && document.summary.taxAmount != null ? <Summary label={`${document.summary.taxLabel || "Impuesto"}${document.summary.taxRate != null ? ` (${document.summary.taxRate} %)` : ""}`} value={money(document.summary.taxAmount, document.currency)} /> : null}
          {document.summary.taxStatus === "not_applicable" ? <Summary label="Impuestos" value="No aplican según configuración" /> : null}
          {document.summary.isProvisional ? <div className="my-2 rounded-lg bg-[#fff6ed] px-3 py-2 text-xs font-semibold text-[#a95818]">Impuestos pendientes de configuración. El total es provisional.</div> : null}
          <div className="mt-3 flex items-end justify-between border-t border-[#cfd9dc] pt-3"><strong className="text-[#08756f]">TOTAL ESTIMADO</strong><strong className="text-2xl text-[#08756f]">{money(document.summary.estimatedTotal, document.currency)}</strong></div>
        </section>

        <div className="space-y-1 text-xs leading-5 text-[#687782]"><p>{document.additionalWorkNotice}</p>{document.scope ? <p>Alcance/notas: {document.scope}</p> : null}{document.warrantyTerms ? <p>Garantía: {document.warrantyTerms}</p> : null}{document.documentTerms ? <p>Condiciones: {document.documentTerms}</p> : null}</div>
    </RepairDocumentShell>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 py-1"><span>{label}</span><strong className="tabular-nums">{value}</strong></div>;
}

function InternalRows({ lines, currency }: { lines: InternalCostLine[]; currency: RepairCurrency }) {
  return <>{lines.map((line) => <tr className="border-t border-[#dfe6e8] align-top" key={line.id}><td className="py-2 pr-2">{line.description}<div className="text-[10px] text-[#687782]">{line.kind === "part" ? "Repuesto/material" : "Mano de obra"}{line.costSource ? ` · ${line.costSource}` : ""}</div></td><td className="py-2 text-right">{line.quantity}<div className="text-[10px] text-[#687782]">{line.unit}</div></td><td className="py-2 text-right">{line.unitCost == null ? <span className="font-semibold text-[#a95818]">Costo pendiente</span> : <><div>{money(line.unitCost, currency)} / u.</div><strong>{money(line.costTotal ?? 0, currency)}</strong></>}</td><td className="py-2 text-right"><div>{money(line.unitSalePrice, currency)} / u.</div><strong>{money(line.saleTotal, currency)}</strong></td><td className="py-2 text-right">{line.difference == null ? "—" : money(line.difference, currency)}</td><td className="py-2 text-right">{line.marginPercent == null ? "—" : `${line.marginPercent} %`}</td></tr>)}</>;
}

export function InternalCostDocument({ document, actions }: { document: InternalCostProjection; actions?: ReactNode }) {
  return (
    <RepairDocumentShell actions={actions} audience="Administración y finanzas" code={`${document.documentNumber}${document.workOrderNumber ? ` / ${document.workOrderNumber}` : ""}`} footer="Uso interno · No entregar al cliente" title={document.title} version={document.version} workshop={document.workshop}>
        <div><div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#08756f]">Administración y finanzas</div><h1 className="mt-1 text-3xl font-extrabold">{document.title}</h1></div>
        <IdentityGrid document={document} />
        <div className="grid gap-3 rounded-2xl bg-[#e5f3f1] p-4 sm:grid-cols-3"><div><Label>Venta sin impuestos</Label><Value>{money(document.summary.revenueExcludingTax, document.currency)}</Value></div><div><Label>Costo directo</Label><Value>{document.summary.directCost == null ? "Costo pendiente" : money(document.summary.directCost, document.currency)}</Value></div><div><Label>Margen bruto</Label><Value>{document.summary.grossMarginAmount == null ? "Cálculo incompleto" : `${money(document.summary.grossMarginAmount, document.currency)} · ${document.summary.grossMarginPercent} %`}</Value></div></div>
        {document.summary.incomplete ? <div className="rounded-xl border border-[#f1c7a6] bg-[#fff6ed] px-4 py-3 text-sm font-semibold text-[#a95818]">Cálculo incompleto: {document.summary.missingCostCount} línea(s) tienen costo pendiente. No se presenta un margen aparente.</div> : null}

        {document.groups.map((group, index) => <section className="repair-document-block" key={group.name}><h2 className="mb-2 text-base font-extrabold text-[#08756f]">{index + 1}. {group.name}</h2><table className="w-full text-[11px]"><thead className="text-left uppercase text-[#687782]"><tr><th className="py-2">Concepto</th><th className="py-2 text-right">Cantidad</th><th className="py-2 text-right">Costo unit. / total</th><th className="py-2 text-right">Venta unit. / total</th><th className="py-2 text-right">Diferencia</th><th className="py-2 text-right">Margen</th></tr></thead><tbody><InternalRows currency={document.currency} lines={[...group.parts, ...group.labor]} /><tr className="bg-[#f2f5f5] font-bold"><td className="px-2 py-2">Total {group.name}</td><td /><td className="px-2 py-2 text-right">{group.costTotal == null ? "Pendiente" : money(group.costTotal, document.currency)}</td><td className="px-2 py-2 text-right">{money(group.saleTotal, document.currency)}</td><td className="px-2 py-2 text-right">{group.marginAmount == null ? "—" : money(group.marginAmount, document.currency)}</td><td /></tr></tbody></table></section>)}

        {document.expenses.length ? <section className="repair-document-block"><h2 className="mb-2 font-extrabold">Gastos atribuibles registrados</h2>{document.expenses.map((expense) => <Summary key={expense.id} label={`${expense.description}${expense.incurredAt ? ` · ${date(expense.incurredAt)}` : ""}`} value={money(expense.amount, document.currency)} />)}</section> : null}

        <section className="repair-document-block ml-auto max-w-2xl rounded-2xl bg-[#e5f3f1] p-4 text-sm"><Summary label="Ingreso previsto sin impuestos cobrados por cuenta del fisco" value={money(document.summary.revenueExcludingTax, document.currency)} /><Summary label="Costos directos de materiales" value={document.summary.directMaterialCost == null ? "Costo pendiente" : money(document.summary.directMaterialCost, document.currency)} /><Summary label="Costo/pago del mecánico" value={document.summary.directMechanicCost == null ? "Costo pendiente" : money(document.summary.directMechanicCost, document.currency)} /><Summary label="Margen bruto" value={document.summary.grossMarginAmount == null ? "Cálculo incompleto" : money(document.summary.grossMarginAmount, document.currency)} />{document.summary.attributableExpenses > 0 ? <Summary label="Gastos atribuibles" value={`- ${money(document.summary.attributableExpenses, document.currency)}`} /> : null}<div className="mt-3 flex justify-between border-t border-[#b9d7d4] pt-3 text-lg font-extrabold text-[#08756f]"><span>RESULTADO ESTIMADO</span><span>{document.summary.estimatedResult == null ? "Cálculo incompleto" : money(document.summary.estimatedResult, document.currency)}</span></div><p className="mt-2 text-[10px] text-[#687782]">Base de costos: previstos. Los consumos, pagos o ajustes reales deben registrarse por separado.</p></section>
    </RepairDocumentShell>
  );
}

export function MechanicWorkOrderDocument({ document, actions, workshop }: { document: MechanicWorkOrderProjection; actions?: ReactNode; workshop: ClientQuoteProjection["workshop"] }) {
  return (
    <RepairDocumentShell accent="amber" actions={actions} audience="Para el mecánico" code={document.workOrderNumber} footer="Uso interno · No entregar al cliente" status={document.status} title={document.title} version={document.version} workshop={workshop}>
        <div><div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a95818]">Para el mecánico</div><h1 className="mt-1 text-3xl font-extrabold">{document.title}</h1></div>
        <div className="grid gap-3 rounded-2xl bg-[#f2f5f5] p-4 sm:grid-cols-2"><div><Label>Vehículo</Label><Value>{document.vehicleLabel}{document.plate ? ` · Placa ${document.plate}` : ""}</Value>{document.mileage != null ? <Hint>{document.mileage.toLocaleString("es-VE")} km</Hint> : null}</div><div><Label>Asignado a</Label><Value>{document.responsible}</Value><Hint>{document.status} · {document.quoteNumber} v{document.version}</Hint></div></div>
        {document.authorizationNotice ? <div className="rounded-xl bg-[#fff0e3] px-4 py-3 text-sm font-extrabold text-[#a95818]">{document.authorizationNotice}</div> : null}

        {document.groups.map((group, index) => <section className="repair-document-block space-y-3" key={group.name}><div className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-lg bg-[#a95818] font-bold text-white">{index + 1}</span><h2 className="text-lg font-extrabold">{group.name}</h2></div><div className="space-y-2">{group.tasks.map((task) => <div className="flex items-start gap-3 text-sm" key={task.id}><span aria-hidden className="mt-0.5 size-5 shrink-0 rounded border-2 border-[#a95818]" /><span>{task.description}{task.quantity !== 1 ? ` · ${task.quantity} ${task.unit}` : ""}</span></div>)}</div>{group.parts.length ? <div className="rounded-xl bg-[#f2f5f5] p-4"><Label>Repuestos necesarios</Label><div className="mt-2 text-sm">{group.parts.map((part) => `${part.description} · ${part.quantity} ${part.unit}`).join(" / ")}</div></div> : null}</section>)}

        {document.technicalNotes ? <section className="repair-document-block"><Label>Notas técnicas</Label><p className="mt-2 text-sm leading-6">{document.technicalNotes}</p></section> : null}
        <section className="repair-document-block"><Label>Observaciones / hallazgos</Label><div className="mt-4 space-y-7">{[1, 2, 3].map((line) => <div className="border-b border-[#cfd9dc]" key={line} />)}</div></section>
    </RepairDocumentShell>
  );
}

export function BackButton({ href, label }: { href: string; label: string }) {
  return <Button asChild type="button" variant="outline"><a href={href}>{label}</a></Button>;
}
