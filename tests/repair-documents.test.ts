import { deepStrictEqual, equal, match } from "node:assert/strict";
import { test } from "node:test";

import {
  buildClientQuoteProjection,
  buildInternalCostProjection,
  buildMechanicWorkOrderProjection,
  type RepairDocumentSource,
} from "@/lib/documents/repair-documents";

function source(): RepairDocumentSource & { workOrder: NonNullable<RepairDocumentSource["workOrder"]> } {
  return {
    workshop: { name: "Autocentro Norte" },
    quote: {
      id: "quote-1",
      number: "PRE-0042",
      version: 2,
      status: "approved",
      createdAt: "2026-09-23T12:00:00.000Z",
      currency: "USD",
      discountAmount: 3,
      taxStatus: "applied",
      taxLabel: "IVA",
      taxRate: 16,
    },
    client: { name: "Ana Pérez" },
    vehicle: { label: "Toyota Corolla 2013", plate: "ABC123", mileage: 128450 },
    workOrder: {
      id: "order-1",
      number: "OT-0042",
      status: "diagnostico_pendiente",
      responsible: "Luis M.",
      notes: "Verificar fugas y registrar hallazgos.",
    },
    lines: [
      { id: "p1", itemType: "part", workGroup: "Frenos delanteros", description: "Pastillas", quantity: 1, unit: "juego", unitSalePrice: 65, unitCost: 40, costSource: "inventario" },
      { id: "p2", itemType: "part", workGroup: "Frenos delanteros", description: "Líquido", quantity: 1, unit: "unidad", unitSalePrice: 18, unitCost: 10, costSource: "manual" },
      { id: "l1", itemType: "labor", workGroup: "Frenos delanteros", description: "Reemplazar y probar frenos", quantity: 1, unit: "servicio", unitSalePrice: 42, unitCost: 25, costSource: "pago acordado" },
      { id: "p3", itemType: "part", workGroup: "Cambio de aceite", description: "Filtro", quantity: 1, unit: "unidad", unitSalePrice: 12, unitCost: 7, costSource: "inventario" },
      { id: "p4", itemType: "part", workGroup: "Cambio de aceite", description: "Aceite de motor", quantity: 4, unit: "litro", unitSalePrice: 9, unitCost: 5, costSource: "inventario" },
      { id: "l2", itemType: "labor", workGroup: "Cambio de aceite", description: "Cambiar aceite y filtro", quantity: 1, unit: "servicio", unitSalePrice: 20, unitCost: 12, costSource: "pago acordado" },
    ],
  };
}

test("cliente e interno concilian ventas, descuento e impuesto para dos trabajos", () => {
  const input = source();
  const client = buildClientQuoteProjection(input);
  const internal = buildInternalCostProjection(input);

  equal(client.groups.length, 2);
  equal(client.summary.subtotal, 193);
  equal(client.summary.taxableBase, 190);
  equal(client.summary.taxAmount, 30.4);
  equal(client.summary.estimatedTotal, 220.4);
  equal(internal.summary.revenueExcludingTax, 190);
  deepStrictEqual(
    internal.groups.map((group) => group.saleTotal),
    client.groups.map((group) => group.saleTotal),
  );
});

test("un costo faltante permanece pendiente y anula margen y resultado", () => {
  const input = source();
  input.lines[0].unitCost = null;
  const internal = buildInternalCostProjection(input);

  equal(internal.summary.incomplete, true);
  equal(internal.summary.missingCostCount, 1);
  equal(internal.summary.directMaterialCost, null);
  equal(internal.summary.directCost, null);
  equal(internal.summary.grossMarginAmount, null);
  equal(internal.summary.estimatedResult, null);
});

test("la proyección pública del cliente excluye costos, pagos y márgenes internos", () => {
  const client = buildClientQuoteProjection(source());
  const serialized = JSON.stringify(client);

  equal(client.version, 2);
  equal(/unitCost|costSource|margin|payment|pagoMecanico|costoCompra/i.test(serialized), false);
});

test("impuestos sin tratamiento configurado dejan el total como provisional", () => {
  const input = source();
  input.quote.taxStatus = "pending";
  input.quote.taxRate = null;
  const client = buildClientQuoteProjection(input);

  equal(client.summary.taxAmount, null);
  equal(client.summary.isProvisional, true);
  equal(client.summary.estimatedTotal, client.summary.taxableBase);
});

test("la proyección del mecánico conserva versión, vehículo y trabajos sin datos monetarios", () => {
  const mechanic = buildMechanicWorkOrderProjection(source());
  const serialized = JSON.stringify(mechanic);

  equal(mechanic.version, 2);
  equal(mechanic.vehicleLabel, "Toyota Corolla 2013");
  equal(mechanic.groups.length, 2);
  equal(mechanic.groups[0].tasks.length, 1);
  equal(mechanic.groups[0].parts.length, 2);
  match(serialized, /OT-0042/);
  equal(/price|cost|amount|margin|tax|total|sale|payment|precio|costo|margen|impuesto|pago|subtotal|USD|VES/i.test(serialized), false);
});

test("una OT pendiente nunca se presenta como autorización de inicio", () => {
  const input = source();
  input.quote.status = "sent";
  input.workOrder!.status = "presupuesto_pendiente";
  const mechanic = buildMechanicWorkOrderProjection(input);

  equal(mechanic.pendingApproval, true);
  match(mechanic.authorizationNotice ?? "", /no autoriza/i);
});
