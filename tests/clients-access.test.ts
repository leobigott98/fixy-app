import { deepStrictEqual, equal, rejects } from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";

import {
  assertWorkshopOperationAllowed,
  type WorkshopOperation,
  type WorkshopOperationSubject,
} from "@/lib/permissions";

const workshop = { id: "workshop-a" };
const clientRows = [
  {
    id: "client-a",
    workshop_id: "workshop-a",
    full_name: "Cliente A",
    phone: null,
    whatsapp_phone: null,
    email: null,
    notes: null,
    created_at: "2026-09-23T12:00:00.000Z",
    updated_at: "2026-09-23T12:00:00.000Z",
  },
  {
    id: "client-b",
    workshop_id: "workshop-b",
    full_name: "Cliente B",
    phone: null,
    whatsapp_phone: null,
    email: null,
    notes: null,
    created_at: "2026-09-23T12:00:00.000Z",
    updated_at: "2026-09-23T12:00:00.000Z",
  },
] as Array<Record<string, unknown>>;
const vehicleRows = [
  {
    id: "vehicle-a",
    workshop_id: "workshop-a",
    client_id: "client-a",
    vehicle_label: "Auto A",
    plate: "AAA111",
    make: "Marca",
    model: "Modelo",
    vehicle_year: 2024,
    color: null,
    mileage: null,
  },
];

let currentSubject: WorkshopOperationSubject | null = null;
let savedClients: Array<Record<string, unknown>> = [];

function createQuery(table: string) {
  const filters: Record<string, unknown> = {};
  const inFilters: Record<string, unknown[]> = {};
  let insertedValue: Record<string, unknown> | null = null;
  let updateValue: Record<string, unknown> | null = null;

  function tableRows(): Array<Record<string, unknown>> {
    if (table === "clients") {
      return clientRows;
    }

    if (table === "vehicles") {
      return vehicleRows;
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
    limit() {
      return query;
    },
    insert(value: Record<string, unknown>) {
      insertedValue = value;
      return query;
    },
    update(value: Record<string, unknown>) {
      updateValue = value;
      return query;
    },
    async maybeSingle() {
      return { data: matchingRows()[0] ?? null, error: null };
    },
    async single() {
      const data = insertedValue
        ? {
            id: "client-new",
            created_at: "2026-09-23T12:00:00.000Z",
            updated_at: "2026-09-23T12:00:00.000Z",
            ...insertedValue,
          }
        : matchingRows().map((row) => ({ ...row, ...updateValue }))[0] ?? null;

      if (table === "clients" && data) {
        savedClients.push(data);
      }

      return { data, error: null };
    },
    then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
      onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve({ data: matchingRows(), error: null }).then(
        onfulfilled,
        onrejected,
      );
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

const { getClientDetail, getClientsList } = await import("@/lib/data/clients");
const { saveClientAction } = await import("@/app/actions/clients");

const validClient = {
  fullName: "Cliente nuevo",
  phone: "",
  whatsappPhone: "",
  email: "",
  notes: "",
};

beforeEach(() => {
  currentSubject = null;
  savedClients = [];
});

test("una invocacion directa de mecanico no puede leer ni guardar clientes", async () => {
  currentSubject = {
    role: "mechanic",
    isActive: true,
    mechanicId: "mechanic-a",
  };

  await rejects(() => getClientsList(), /No tienes permiso/);
  deepStrictEqual(await saveClientAction(validClient), {
    success: false,
    message: "No se pudo guardar el cliente.",
  });
  equal(savedClients.length, 0);
});

test("una invocacion directa de miembro inactivo falla cerrada", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: false,
    mechanicId: null,
  };

  deepStrictEqual(await saveClientAction(validClient), {
    success: false,
    message: "No se pudo guardar el cliente.",
  });
  equal(savedClients.length, 0);
});

test("un clientId de otro taller no se puede leer ni actualizar", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: true,
    mechanicId: null,
  };

  await rejects(() => getClientDetail("client-b"), /not found/);
  deepStrictEqual(await saveClientAction(validClient, "client-b"), {
    success: false,
    message: "El cliente seleccionado no esta disponible.",
  });
  equal(savedClients.length, 0);
});

test("finanzas autorizado puede leer y guardar clientes del taller", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: true,
    mechanicId: null,
  };

  const clients = await getClientsList();
  equal(clients.length, 1);
  equal(clients[0]?.id, "client-a");
  deepStrictEqual(await saveClientAction(validClient), {
    success: true,
    message: "Cliente guardado.",
    clientId: "client-new",
  });
  equal(savedClients.length, 1);
});
