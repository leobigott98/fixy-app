export type RepairCurrency = "USD" | "VES" | "USD_VES";

export type RepairDocumentLineSource = {
  id: string;
  itemType: "labor" | "part";
  description: string;
  workGroup?: string | null;
  quantity: number;
  unit?: string | null;
  unitSalePrice: number;
  unitCost?: number | null;
  costSource?: string | null;
};

export type MechanicDocumentLineSource = Pick<
  RepairDocumentLineSource,
  "id" | "itemType" | "description" | "workGroup" | "quantity" | "unit"
>;

export type MechanicDocumentSource = {
  quote: Pick<RepairDocumentSource["quote"], "number" | "version" | "status" | "notes">;
  vehicle: RepairDocumentSource["vehicle"];
  workOrder: NonNullable<RepairDocumentSource["workOrder"]>;
  lines: MechanicDocumentLineSource[];
};

export type RepairDocumentSource = {
  workshop: {
    name: string;
    address?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
    taxId?: string | null;
    logoUrl?: string | null;
    warrantyTerms?: string | null;
    documentTerms?: string | null;
  };
  quote: {
    id: string;
    number: string;
    version: number;
    status: "draft" | "sent" | "approved" | "rejected" | "expired";
    createdAt: string;
    issuedAt?: string | null;
    approvedAt?: string | null;
    validUntil?: string | null;
    notes?: string | null;
    currency: RepairCurrency;
    discountAmount: number;
    taxStatus: "pending" | "applied" | "not_applicable";
    taxLabel?: string | null;
    taxRate?: number | null;
  };
  client: {
    name: string;
  } | null;
  vehicle: {
    label: string;
    plate?: string | null;
    mileage?: number | null;
  } | null;
  workOrder?: {
    id: string;
    number: string;
    status: string;
    responsible?: string | null;
    notes?: string | null;
  } | null;
  lines: RepairDocumentLineSource[];
  attributableExpenses?: Array<{
    id: string;
    description: string;
    amount: number;
    incurredAt?: string | null;
  }>;
};

type PublicLine = {
  id: string;
  kind: "labor" | "part";
  description: string;
  quantity: number;
  unit: string;
  unitSalePrice: number;
  saleTotal: number;
};

type PublicWorkGroup = {
  name: string;
  labor: PublicLine[];
  parts: PublicLine[];
  saleTotal: number;
};

type SharedIdentity = {
  workshop: RepairDocumentSource["workshop"];
  documentNumber: string;
  version: number;
  date: string;
  validUntil: string | null;
  clientName: string;
  vehicleLabel: string;
  plate: string | null;
  mileage: number | null;
  currency: RepairCurrency;
};

export type ClientQuoteProjection = SharedIdentity & {
  audience: "client";
  title: "Presupuesto de reparación";
  isDraft: boolean;
  status: RepairDocumentSource["quote"]["status"];
  groups: PublicWorkGroup[];
  summary: {
    materialsSubtotal: number;
    laborSubtotal: number;
    subtotal: number;
    discountAmount: number;
    taxableBase: number;
    taxStatus: RepairDocumentSource["quote"]["taxStatus"];
    taxLabel: string | null;
    taxRate: number | null;
    taxAmount: number | null;
    estimatedTotal: number;
    isProvisional: boolean;
  };
  scope: string | null;
  warrantyTerms: string | null;
  documentTerms: string | null;
  additionalWorkNotice: string;
};

export type InternalCostLine = PublicLine & {
  unitCost: number | null;
  costTotal: number | null;
  difference: number | null;
  marginPercent: number | null;
  costSource: string | null;
};

export type InternalCostProjection = SharedIdentity & {
  audience: "internal";
  title: "Control interno de costos";
  workOrderNumber: string | null;
  groups: Array<{
    name: string;
    labor: InternalCostLine[];
    parts: InternalCostLine[];
    saleTotal: number;
    costTotal: number | null;
    marginAmount: number | null;
  }>;
  summary: {
    revenueExcludingTax: number;
    directMaterialCost: number | null;
    directMechanicCost: number | null;
    directCost: number | null;
    grossMarginAmount: number | null;
    grossMarginPercent: number | null;
    attributableExpenses: number;
    estimatedResult: number | null;
    incomplete: boolean;
    missingCostCount: number;
    costBasis: "expected";
  };
  expenses: Array<{
    id: string;
    description: string;
    amount: number;
    incurredAt: string | null;
  }>;
};

export type MechanicWorkOrderProjection = {
  audience: "mechanic";
  title: "Orden de trabajo";
  workOrderNumber: string;
  quoteNumber: string;
  version: number;
  vehicleLabel: string;
  plate: string | null;
  mileage: number | null;
  status: string;
  responsible: string;
  pendingApproval: boolean;
  authorizationNotice: string | null;
  groups: Array<{
    name: string;
    tasks: Array<{ id: string; description: string; quantity: number; unit: string }>;
    parts: Array<{ id: string; description: string; quantity: number; unit: string }>;
  }>;
  technicalNotes: string | null;
};

function toMinor(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100);
}

function fromMinor(value: number) {
  return Number((value / 100).toFixed(2));
}

export function multiplyMoney(quantity: number, unitAmount: number) {
  return fromMinor(Math.round(quantity * toMinor(unitAmount)));
}

function addMoney(values: number[]) {
  return fromMinor(values.reduce((sum, value) => sum + toMinor(value), 0));
}

function subtractMoney(left: number, right: number) {
  return fromMinor(toMinor(left) - toMinor(right));
}

function normalizeUnit(line: Pick<RepairDocumentLineSource, "itemType" | "unit">) {
  return line.unit?.trim() || (line.itemType === "labor" ? "servicio" : "unidad");
}

function buildPublicLine(line: RepairDocumentLineSource): PublicLine {
  return {
    id: line.id,
    kind: line.itemType,
    description: line.description,
    quantity: line.quantity,
    unit: normalizeUnit(line),
    unitSalePrice: fromMinor(toMinor(line.unitSalePrice)),
    saleTotal: multiplyMoney(line.quantity, line.unitSalePrice),
  };
}

function groupLines<T extends Pick<RepairDocumentLineSource, "workGroup">>(lines: T[]) {
  const groups = new Map<string, T[]>();

  for (const line of lines) {
    const name = line.workGroup?.trim() || "Trabajo general";
    groups.set(name, [...(groups.get(name) ?? []), line]);
  }

  return [...groups.entries()].map(([name, groupedLines]) => ({ name, lines: groupedLines }));
}

function buildIdentity(source: RepairDocumentSource): SharedIdentity {
  return {
    workshop: source.workshop,
    documentNumber: source.quote.number,
    version: source.quote.version,
    date: source.quote.issuedAt || source.quote.createdAt,
    validUntil: source.quote.validUntil ?? null,
    clientName: source.client?.name || "Cliente pendiente",
    vehicleLabel: source.vehicle?.label || "Vehículo pendiente",
    plate: source.vehicle?.plate ?? null,
    mileage: source.vehicle?.mileage ?? null,
    currency: source.quote.currency,
  };
}

export function buildClientQuoteProjection(source: RepairDocumentSource): ClientQuoteProjection {
  const lines = source.lines.map(buildPublicLine);
  const laborSubtotal = addMoney(lines.filter((line) => line.kind === "labor").map((line) => line.saleTotal));
  const materialsSubtotal = addMoney(lines.filter((line) => line.kind === "part").map((line) => line.saleTotal));
  const subtotal = addMoney([laborSubtotal, materialsSubtotal]);
  const discountAmount = Math.min(fromMinor(toMinor(source.quote.discountAmount)), subtotal);
  const taxableBase = subtractMoney(subtotal, discountAmount);
  const taxRate = source.quote.taxStatus === "applied" ? source.quote.taxRate ?? null : null;
  const taxAmount = taxRate === null ? null : multiplyMoney(taxableBase, taxRate / 100);
  const isProvisional = source.quote.taxStatus === "pending" || (source.quote.taxStatus === "applied" && taxRate === null);
  const estimatedTotal = addMoney([taxableBase, taxAmount ?? 0]);

  return {
    ...buildIdentity(source),
    audience: "client",
    title: "Presupuesto de reparación",
    isDraft: source.quote.status === "draft",
    status: source.quote.status,
    groups: groupLines(source.lines).map((group) => {
      const publicLines = group.lines.map(buildPublicLine);
      return {
        name: group.name,
        labor: publicLines.filter((line) => line.kind === "labor"),
        parts: publicLines.filter((line) => line.kind === "part"),
        saleTotal: addMoney(publicLines.map((line) => line.saleTotal)),
      };
    }),
    summary: {
      materialsSubtotal,
      laborSubtotal,
      subtotal,
      discountAmount,
      taxableBase,
      taxStatus: source.quote.taxStatus,
      taxLabel: source.quote.taxLabel ?? null,
      taxRate,
      taxAmount,
      estimatedTotal,
      isProvisional,
    },
    scope: source.quote.notes ?? null,
    warrantyTerms: source.workshop.warrantyTerms ?? null,
    documentTerms: source.workshop.documentTerms ?? null,
    additionalWorkNotice: "Cualquier trabajo adicional o cambio de alcance requiere una nueva aprobación.",
  };
}

function buildInternalLine(line: RepairDocumentLineSource): InternalCostLine {
  const publicLine = buildPublicLine(line);
  const unitCost = line.unitCost == null ? null : fromMinor(toMinor(line.unitCost));
  const costTotal = unitCost == null ? null : multiplyMoney(line.quantity, unitCost);
  const difference = costTotal == null ? null : subtractMoney(publicLine.saleTotal, costTotal);
  const marginPercent =
    difference == null || publicLine.saleTotal === 0
      ? null
      : Number(((difference / publicLine.saleTotal) * 100).toFixed(1));

  return {
    ...publicLine,
    unitCost,
    costTotal,
    difference,
    marginPercent,
    costSource: line.costSource ?? null,
  };
}

export function buildInternalCostProjection(source: RepairDocumentSource): InternalCostProjection {
  const client = buildClientQuoteProjection(source);
  const internalLines = source.lines.map(buildInternalLine);
  const missingCostCount = internalLines.filter((line) => line.costTotal == null).length;
  const incomplete = missingCostCount > 0;
  const materialCosts = internalLines.filter((line) => line.kind === "part").map((line) => line.costTotal);
  const mechanicCosts = internalLines.filter((line) => line.kind === "labor").map((line) => line.costTotal);
  const directMaterialCost = materialCosts.some((value) => value == null)
    ? null
    : addMoney(materialCosts as number[]);
  const directMechanicCost = mechanicCosts.some((value) => value == null)
    ? null
    : addMoney(mechanicCosts as number[]);
  const directCost =
    directMaterialCost == null || directMechanicCost == null
      ? null
      : addMoney([directMaterialCost, directMechanicCost]);
  const revenueExcludingTax = client.summary.taxableBase;
  const grossMarginAmount = directCost == null ? null : subtractMoney(revenueExcludingTax, directCost);
  const grossMarginPercent =
    grossMarginAmount == null || revenueExcludingTax === 0
      ? null
      : Number(((grossMarginAmount / revenueExcludingTax) * 100).toFixed(1));
  const expenses = (source.attributableExpenses ?? []).map((expense) => ({
    id: expense.id,
    description: expense.description,
    amount: fromMinor(toMinor(expense.amount)),
    incurredAt: expense.incurredAt ?? null,
  }));
  const attributableExpenses = addMoney(expenses.map((expense) => expense.amount));
  const estimatedResult =
    grossMarginAmount == null ? null : subtractMoney(grossMarginAmount, attributableExpenses);

  return {
    ...buildIdentity(source),
    audience: "internal",
    title: "Control interno de costos",
    workOrderNumber: source.workOrder?.number ?? null,
    groups: groupLines(source.lines).map((group) => {
      const lines = group.lines.map(buildInternalLine);
      const hasMissingCost = lines.some((line) => line.costTotal == null);
      const saleTotal = addMoney(lines.map((line) => line.saleTotal));
      const costTotal = hasMissingCost ? null : addMoney(lines.map((line) => line.costTotal as number));
      return {
        name: group.name,
        labor: lines.filter((line) => line.kind === "labor"),
        parts: lines.filter((line) => line.kind === "part"),
        saleTotal,
        costTotal,
        marginAmount: costTotal == null ? null : subtractMoney(saleTotal, costTotal),
      };
    }),
    summary: {
      revenueExcludingTax,
      directMaterialCost,
      directMechanicCost,
      directCost,
      grossMarginAmount,
      grossMarginPercent,
      attributableExpenses,
      estimatedResult,
      incomplete,
      missingCostCount,
      costBasis: "expected",
    },
    expenses,
  };
}

export function buildMechanicWorkOrderProjection(source: MechanicDocumentSource): MechanicWorkOrderProjection {
  const pendingApproval = source.workOrder.status === "presupuesto_pendiente" || source.quote.status !== "approved";

  return {
    audience: "mechanic",
    title: "Orden de trabajo",
    workOrderNumber: source.workOrder.number,
    quoteNumber: source.quote.number,
    version: source.quote.version,
    vehicleLabel: source.vehicle?.label || "Vehículo pendiente",
    plate: source.vehicle?.plate ?? null,
    mileage: source.vehicle?.mileage ?? null,
    status: source.workOrder.status,
    responsible: source.workOrder.responsible || "Sin asignar",
    pendingApproval,
    authorizationNotice: pendingApproval
      ? "Pendiente de aprobación. Esta orden no autoriza el inicio de reparaciones."
      : null,
    groups: groupLines(source.lines).map((group) => ({
      name: group.name,
      tasks: group.lines
        .filter((line) => line.itemType === "labor")
        .map((line) => ({
          id: line.id,
          description: line.description,
          quantity: line.quantity,
          unit: normalizeUnit(line),
        })),
      parts: group.lines
        .filter((line) => line.itemType === "part")
        .map((line) => ({
          id: line.id,
          description: line.description,
          quantity: line.quantity,
          unit: normalizeUnit(line),
        })),
    })),
    technicalNotes: source.workOrder.notes ?? source.quote.notes ?? null,
  };
}
