import { deepStrictEqual, equal, rejects } from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";

import {
  assertWorkshopOperationAllowed,
  type WorkshopOperation,
  type WorkshopOperationSubject,
} from "@/lib/permissions";

const workshop = { id: "workshop-a" };
const inventoryRows = [
  {
    id: "item-a",
    workshop_id: "workshop-a",
    name: "Filtro A",
    description: null,
    stock_quantity: 5,
    low_stock_threshold: 1,
    cost: 10,
    reference_sale_price: 15,
    sku: null,
    notes: null,
    created_at: "2026-09-15T12:00:00.000Z",
    updated_at: "2026-09-15T12:00:00.000Z",
  },
  {
    id: "item-b",
    workshop_id: "workshop-b",
    name: "Filtro B",
    description: null,
    stock_quantity: 8,
    low_stock_threshold: 1,
    cost: 12,
    reference_sale_price: 18,
    sku: null,
    notes: null,
    created_at: "2026-09-15T12:00:00.000Z",
    updated_at: "2026-09-15T12:00:00.000Z",
  },
];
const workOrderRows = [
  { id: "work-order-a", workshop_id: "workshop-a" },
  { id: "work-order-b", workshop_id: "workshop-b" },
];

let currentSubject: WorkshopOperationSubject | null = null;
let savedInventoryItems: Array<Record<string, unknown>> = [];
let insertedMovements: Array<Record<string, unknown>> = [];

function createQuery(table: string) {
  const filters: Record<string, unknown> = {};
  const inFilters: Record<string, unknown[]> = {};
  let insertedValue: Record<string, unknown> | Array<Record<string, unknown>> | null = null;
  let updateValue: Record<string, unknown> | null = null;
  let deleting = false;

  function tableRows(): Array<Record<string, unknown>> {
    if (table === "inventory_items") {
      return inventoryRows;
    }

    if (table === "work_orders") {
      return workOrderRows;
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

      if (table === "inventory_movements") {
        insertedMovements.push(...values);
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
    or() {
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
            id: "item-new",
            created_at: "2026-09-15T12:00:00.000Z",
            ...value,
          }
        : matchingRows().map((row) => ({ ...row, ...updateValue }))[0] ?? null;

      if (table === "inventory_items" && data) {
        savedInventoryItems.push(data);
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

const {
  InventoryInputError,
  getInventoryList,
  syncWorkOrderInventoryUsage,
} = await import("@/lib/data/inventory");
const { saveInventoryItemAction } = await import("@/app/actions/inventory");

const validItem = {
  name: "Filtro nuevo",
  description: "",
  stockQuantity: "3",
  lowStockThreshold: "1",
  cost: "10",
  referenceSalePrice: "15",
  sku: "",
  notes: "",
};

beforeEach(() => {
  currentSubject = null;
  savedInventoryItems = [];
  insertedMovements = [];
});

test("una invocacion directa de mecanico no puede leer ni guardar inventario", async () => {
  currentSubject = {
    role: "mechanic",
    isActive: true,
    mechanicId: "mechanic-a",
  };

  await rejects(() => getInventoryList(), /No tienes permiso/);
  deepStrictEqual(await saveInventoryItemAction(validItem), {
    success: false,
    message: "No se pudo guardar el repuesto.",
  });
  equal(savedInventoryItems.length, 0);
});

test("una invocacion directa de miembro inactivo falla cerrada", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: false,
    mechanicId: null,
  };

  deepStrictEqual(await saveInventoryItemAction(validItem), {
    success: false,
    message: "No se pudo guardar el repuesto.",
  });
  equal(savedInventoryItems.length, 0);
});

test("IDs de otro taller no se pueden usar", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: true,
    mechanicId: null,
  };

  deepStrictEqual(await saveInventoryItemAction(validItem, "item-b"), {
    success: false,
    message: "El repuesto seleccionado no esta disponible.",
  });

  await rejects(
    () =>
      syncWorkOrderInventoryUsage({
        workshopId: "workshop-a",
        workOrderId: "work-order-b",
        previousUsage: {},
        nextUsage: {},
      }),
    (error) =>
      error instanceof InventoryInputError &&
      error.code === "work_order_not_available",
  );

  await rejects(
    () =>
      syncWorkOrderInventoryUsage({
        workshopId: "workshop-a",
        workOrderId: "work-order-a",
        previousUsage: {},
        nextUsage: { "item-b": 1 },
      }),
    (error) =>
      error instanceof InventoryInputError &&
      error.code === "inventory_items_not_available",
  );

  equal(savedInventoryItems.length, 0);
  equal(insertedMovements.length, 0);
});

test("finanzas autorizado puede guardar inventario", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: true,
    mechanicId: null,
  };

  deepStrictEqual(await saveInventoryItemAction(validItem), {
    success: true,
    message: "Repuesto guardado.",
    inventoryItemId: "item-new",
  });
  equal(savedInventoryItems.length, 1);
  equal(insertedMovements.length, 1);
});
