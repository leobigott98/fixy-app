import { deepStrictEqual, equal, rejects } from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";

import {
  assertWorkshopOperationAllowed,
  type WorkshopOperation,
  type WorkshopOperationSubject,
} from "@/lib/permissions";

const workshop = { id: "workshop-a" };
const supplierA = "11111111-1111-4111-8111-111111111111";
const supplierB = "22222222-2222-4222-8222-222222222222";
const inventoryItemA = "33333333-3333-4333-8333-333333333333";
const inventoryItemB = "44444444-4444-4444-8444-444444444444";

const supplierRows = [
  { id: supplierA, workshop_id: "workshop-a" },
  { id: supplierB, workshop_id: "workshop-b" },
];
const inventoryRows = [
  { id: inventoryItemA, workshop_id: "workshop-a" },
  { id: inventoryItemB, workshop_id: "workshop-b" },
];
const purchaseOrderRows = [
  { id: "purchase-order-a", workshop_id: "workshop-a", code: "OC-A" },
  { id: "purchase-order-b", workshop_id: "workshop-b", code: "OC-B" },
];

let currentSubject: WorkshopOperationSubject | null = null;
let savedPurchaseOrders: Array<Record<string, unknown>> = [];
let savedPurchaseOrderItems: Array<Record<string, unknown>> = [];

function createQuery(table: string) {
  const filters: Record<string, unknown> = {};
  const inFilters: Record<string, unknown[]> = {};
  let insertedValue: Record<string, unknown> | Array<Record<string, unknown>> | null = null;
  let updateValue: Record<string, unknown> | null = null;
  let deleting = false;

  function tableRows(): Array<Record<string, unknown>> {
    if (table === "suppliers") {
      return supplierRows;
    }

    if (table === "inventory_items") {
      return inventoryRows;
    }

    if (table === "purchase_orders") {
      return purchaseOrderRows;
    }

    return [];
  }

  function matchingRows() {
    return tableRows().filter(
      (row) =>
        Object.entries(filters).every(([column, value]) => row[column] === value) &&
        Object.entries(inFilters).every(([column, values]) => values.includes(row[column])),
    );
  }

  function execute() {
    if (insertedValue) {
      const values = Array.isArray(insertedValue) ? insertedValue : [insertedValue];

      if (table === "purchase_order_items") {
        savedPurchaseOrderItems.push(...values);
      }

      return { data: null, error: null };
    }

    if (updateValue) {
      return { data: matchingRows().map((row) => ({ ...row, ...updateValue })), error: null };
    }

    if (deleting) {
      return { data: null, error: null };
    }

    return { data: matchingRows(), error: null };
  }

  const query = {
    select() {
      return query;
    },
    eq(column: string, value: unknown) {
      filters[column] = value;
      return query;
    },
    in(column: string, values: unknown[]) {
      inFilters[column] = values;
      return query;
    },
    order() {
      return query;
    },
    insert(value: Record<string, unknown> | Array<Record<string, unknown>>) {
      insertedValue = value;
      return query;
    },
    update(value: Record<string, unknown>) {
      updateValue = value;
      return query;
    },
    delete() {
      deleting = true;
      return query;
    },
    async maybeSingle() {
      return { data: matchingRows()[0] ?? null, error: null };
    },
    async single() {
      const value = Array.isArray(insertedValue) ? insertedValue[0] : insertedValue;
      const data = value
        ? {
            id: "purchase-order-new",
            created_at: "2026-09-16T12:00:00.000Z",
            updated_at: "2026-09-16T12:00:00.000Z",
            ...value,
          }
        : matchingRows().map((row) => ({ ...row, ...updateValue }))[0] ?? null;

      if (table === "purchase_orders" && data) {
        savedPurchaseOrders.push(data);
      }

      return { data, error: null };
    },
    then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
      onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve(execute()).then(onfulfilled, onrejected);
    },
  };

  return query;
}

mock.module("@/lib/data/workshops", {
  namedExports: {
    async requireWorkshopOperation(operation: WorkshopOperation) {
      assertWorkshopOperationAllowed(currentSubject, operation);

      return {
        workshop,
        role: currentSubject?.role,
        member: currentSubject
          ? {
              is_active: currentSubject.isActive,
              mechanic_id: currentSubject.mechanicId,
            }
          : null,
      };
    },
  },
});

mock.module("@/lib/data/core", {
  namedExports: {
    async createSupabaseDataClient() {
      return {
        from(table: string) {
          return createQuery(table);
        },
      };
    },
    isMissingRelationError() {
      return false;
    },
  },
});

mock.module("@/lib/data/inventory", {
  namedExports: {
    async getInventoryPartOptions() {
      return [];
    },
  },
});

mock.module("next/cache", {
  namedExports: {
    revalidatePath() {},
  },
});

mock.module("next/navigation", {
  namedExports: {
    notFound() {
      throw new Error("not found");
    },
    redirect() {
      throw new Error("redirect");
    },
  },
});

const { getPurchaseOrdersList } = await import("@/lib/data/purchase-orders");
const { savePurchaseOrderAction } = await import("@/app/actions/purchase-orders");

function validPurchaseOrder(overrides: {
  supplierId?: string;
  inventoryItemId?: string;
} = {}) {
  return {
    supplierId: overrides.supplierId ?? supplierA,
    date: "2026-09-16",
    status: "draft" as const,
    notes: "",
    items: [
      {
        rowId: "row-1",
        inventoryItemId: overrides.inventoryItemId ?? inventoryItemA,
        description: "Filtro de aceite",
        quantity: "2",
        unitCost: "10",
      },
    ],
  };
}

beforeEach(() => {
  currentSubject = null;
  savedPurchaseOrders = [];
  savedPurchaseOrderItems = [];
});

test("una invocacion directa de mecanico no puede leer ni guardar compras", async () => {
  currentSubject = {
    role: "mechanic",
    isActive: true,
    mechanicId: "mechanic-a",
  };

  await rejects(() => getPurchaseOrdersList(), /No tienes permiso/);
  deepStrictEqual(await savePurchaseOrderAction(validPurchaseOrder()), {
    success: false,
    message: "No se pudo guardar la orden de compra.",
  });
  equal(savedPurchaseOrders.length, 0);
});

test("una invocacion directa de miembro inactivo falla cerrada", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: false,
    mechanicId: null,
  };

  deepStrictEqual(await savePurchaseOrderAction(validPurchaseOrder()), {
    success: false,
    message: "No se pudo guardar la orden de compra.",
  });
  equal(savedPurchaseOrders.length, 0);
});

test("los IDs relacionados de otro taller no se pueden usar", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: true,
    mechanicId: null,
  };

  deepStrictEqual(
    await savePurchaseOrderAction(validPurchaseOrder({ supplierId: supplierB })),
    {
      success: false,
      message: "El proveedor seleccionado no esta disponible.",
    },
  );
  deepStrictEqual(
    await savePurchaseOrderAction(validPurchaseOrder({ inventoryItemId: inventoryItemB })),
    {
      success: false,
      message: "Uno o mas repuestos no estan disponibles.",
    },
  );
  deepStrictEqual(
    await savePurchaseOrderAction(validPurchaseOrder(), "purchase-order-b"),
    {
      success: false,
      message: "La orden de compra seleccionada no esta disponible.",
    },
  );
  equal(savedPurchaseOrders.length, 0);
  equal(savedPurchaseOrderItems.length, 0);
});

test("finanzas autorizado puede guardar una compra del taller", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: true,
    mechanicId: null,
  };

  deepStrictEqual(await savePurchaseOrderAction(validPurchaseOrder()), {
    success: true,
    message: "Orden de compra guardada.",
    purchaseOrderId: "purchase-order-new",
  });
  equal(savedPurchaseOrders.length, 1);
  equal(savedPurchaseOrderItems.length, 1);
  equal(savedPurchaseOrderItems[0]?.workshop_id, "workshop-a");
});
