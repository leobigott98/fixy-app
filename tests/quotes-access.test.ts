import { deepStrictEqual, equal, rejects } from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";

import {
  assertWorkshopOperationAllowed,
  type WorkshopOperation,
  type WorkshopOperationSubject,
} from "@/lib/permissions";

const workshop = { id: "workshop-a" };
const clientA = "11111111-1111-4111-8111-111111111111";
const clientB = "22222222-2222-4222-8222-222222222222";
const vehicleA = "33333333-3333-4333-8333-333333333333";
const vehicleB = "44444444-4444-4444-8444-444444444444";
const inventoryItemA = "55555555-5555-4555-8555-555555555555";
const inventoryItemB = "66666666-6666-4666-8666-666666666666";

const clientRows = [
  { id: clientA, workshop_id: "workshop-a" },
  { id: clientB, workshop_id: "workshop-b" },
];
const vehicleRows = [
  {
    id: vehicleA,
    workshop_id: "workshop-a",
    client_id: clientA,
    vehicle_label: "Auto A",
    plate: "AAA111",
    make: "Marca",
    model: "Modelo",
    vehicle_year: 2024,
  },
  {
    id: vehicleB,
    workshop_id: "workshop-b",
    client_id: clientB,
    vehicle_label: "Auto B",
    plate: "BBB222",
    make: "Marca",
    model: "Modelo",
    vehicle_year: 2023,
  },
];
const inventoryRows = [
  { id: inventoryItemA, workshop_id: "workshop-a" },
  { id: inventoryItemB, workshop_id: "workshop-b" },
];
const quoteRows = [
  {
    id: "quote-a",
    workshop_id: "workshop-a",
    client_id: clientA,
    vehicle_id: vehicleA,
    title: "Presupuesto A",
    status: "draft",
    subtotal: 10,
    total_amount: 10,
    notes: null,
    sent_at: null,
    approved_at: null,
    public_share_token: null,
    public_share_enabled: false,
    public_shared_at: null,
    archived_at: null,
    deleted_at: null,
    created_at: "2026-09-16T12:00:00.000Z",
    updated_at: "2026-09-16T12:00:00.000Z",
  },
  {
    id: "quote-b",
    workshop_id: "workshop-b",
    client_id: clientB,
    vehicle_id: vehicleB,
    title: "Presupuesto B",
    status: "draft",
    subtotal: 20,
    total_amount: 20,
    notes: null,
    sent_at: null,
    approved_at: null,
    public_share_token: null,
    public_share_enabled: false,
    public_shared_at: null,
    archived_at: null,
    deleted_at: null,
    created_at: "2026-09-16T12:00:00.000Z",
    updated_at: "2026-09-16T12:00:00.000Z",
  },
];

let currentSubject: WorkshopOperationSubject | null = null;
let savedQuotes: Array<Record<string, unknown>> = [];
let savedQuoteItems: Array<Record<string, unknown>> = [];
let updatedQuotes: Array<Record<string, unknown>> = [];

function createQuery(table: string) {
  const filters: Record<string, unknown> = {};
  const inFilters: Record<string, unknown[]> = {};
  let insertedValue: Record<string, unknown> | Array<Record<string, unknown>> | null = null;
  let updateValue: Record<string, unknown> | null = null;
  let deleting = false;

  function tableRows(): Array<Record<string, unknown>> {
    if (table === "clients") {
      return clientRows;
    }

    if (table === "vehicles") {
      return vehicleRows;
    }

    if (table === "inventory_items") {
      return inventoryRows;
    }

    if (table === "quotes") {
      return quoteRows;
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

      if (table === "quote_items") {
        savedQuoteItems.push(...values);
      }

      return { data: null, error: null };
    }

    if (updateValue) {
      const data = matchingRows().map((row) => ({ ...row, ...updateValue }));

      if (table === "quotes") {
        updatedQuotes.push(...data);
      }

      return { data, error: null };
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
    is(column: string, value: unknown) {
      filters[column] = value;
      return query;
    },
    not() {
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
      const row = matchingRows()[0] ?? null;
      const data = row && updateValue ? { ...row, ...updateValue } : row;

      if (table === "quotes" && data && updateValue) {
        updatedQuotes.push(data);
      }

      return { data, error: null };
    },
    async single() {
      const value = Array.isArray(insertedValue) ? insertedValue[0] : insertedValue;
      const data = value
        ? {
            id: "quote-new",
            public_share_token: null,
            public_share_enabled: false,
            public_shared_at: null,
            archived_at: null,
            created_at: "2026-09-16T12:00:00.000Z",
            updated_at: "2026-09-16T12:00:00.000Z",
            ...value,
          }
        : matchingRows().map((row) => ({ ...row, ...updateValue }))[0] ?? null;

      if (table === "quotes" && data && insertedValue) {
        savedQuotes.push(data);
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
    async createSupabaseSessionClient() {
      return {
        from(table: string) {
          return createQuery(table);
        },
      };
    },
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

const { getQuotesList } = await import("@/lib/data/quotes");
const { saveQuoteAction, updateQuoteLifecycleAction } = await import("@/app/actions/quotes");

function validQuote(overrides: {
  clientId?: string;
  vehicleId?: string;
  inventoryItemId?: string;
} = {}) {
  return {
    clientId: overrides.clientId ?? clientA,
    vehicleId: overrides.vehicleId ?? vehicleA,
    status: "draft" as const,
    notes: "",
    laborItems: [
      {
        rowId: "labor-1",
        inventoryItemId: "",
        itemType: "labor" as const,
        description: "Mano de obra",
        quantity: "1",
        unitPrice: "10",
      },
    ],
    partItems: [
      {
        rowId: "part-1",
        inventoryItemId: overrides.inventoryItemId ?? inventoryItemA,
        itemType: "part" as const,
        description: "Filtro de aceite",
        quantity: "1",
        unitPrice: "5",
      },
    ],
  };
}

beforeEach(() => {
  currentSubject = null;
  savedQuotes = [];
  savedQuoteItems = [];
  updatedQuotes = [];
});

test("una invocacion directa de mecanico no puede leer ni mutar presupuestos", async () => {
  currentSubject = {
    role: "mechanic",
    isActive: true,
    mechanicId: "mechanic-a",
  };

  await rejects(() => getQuotesList(), /No tienes permiso/);
  deepStrictEqual(await saveQuoteAction(validQuote()), {
    success: false,
    message: "No se pudo guardar el presupuesto.",
  });
  deepStrictEqual(await updateQuoteLifecycleAction("quote-a", "archive"), {
    success: false,
    message: "No se pudo actualizar el presupuesto.",
  });
  equal(savedQuotes.length, 0);
  equal(updatedQuotes.length, 0);
});

test("una invocacion directa de miembro inactivo falla cerrada", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: false,
    mechanicId: null,
  };

  deepStrictEqual(await saveQuoteAction(validQuote()), {
    success: false,
    message: "No se pudo guardar el presupuesto.",
  });
  equal(savedQuotes.length, 0);
});

test("los IDs relacionados de otro taller no se pueden usar", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: true,
    mechanicId: null,
  };

  deepStrictEqual(await saveQuoteAction(validQuote({ clientId: clientB, vehicleId: vehicleB })), {
    success: false,
    message: "El cliente seleccionado no esta disponible.",
  });
  deepStrictEqual(await saveQuoteAction(validQuote({ vehicleId: vehicleB })), {
    success: false,
    message: "El vehiculo seleccionado no esta disponible para ese cliente.",
  });
  deepStrictEqual(await saveQuoteAction(validQuote({ inventoryItemId: inventoryItemB })), {
    success: false,
    message: "Uno o mas repuestos no estan disponibles.",
  });
  deepStrictEqual(await saveQuoteAction(validQuote(), "quote-b"), {
    success: false,
    message: "El presupuesto seleccionado no esta disponible.",
  });
  deepStrictEqual(await updateQuoteLifecycleAction("quote-b", "archive"), {
    success: false,
    message: "El presupuesto seleccionado no esta disponible.",
  });
  equal(savedQuotes.length, 0);
  equal(savedQuoteItems.length, 0);
  equal(updatedQuotes.length, 0);
});

test("finanzas autorizado puede guardar y archivar presupuestos del taller", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: true,
    mechanicId: null,
  };

  deepStrictEqual(await saveQuoteAction(validQuote()), {
    success: true,
    message: "Presupuesto guardado.",
    quoteId: "quote-new",
  });
  deepStrictEqual(await updateQuoteLifecycleAction("quote-a", "archive"), {
    success: true,
    message: "Presupuesto archivado.",
    quoteId: "quote-a",
  });
  equal(savedQuotes.length, 1);
  equal(savedQuoteItems.length, 2);
  equal(savedQuoteItems[0]?.workshop_id, "workshop-a");
  equal(updatedQuotes.length, 1);
});
