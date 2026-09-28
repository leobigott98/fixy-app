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

const clientRows = [
  { id: clientA, workshop_id: "workshop-a", full_name: "Cliente A" },
  { id: clientB, workshop_id: "workshop-b", full_name: "Cliente B" },
];
const vehicleRows = [
  {
    id: "vehicle-a",
    workshop_id: "workshop-a",
    client_id: clientA,
    vehicle_label: "Toyota Corolla 2024 - AAA111",
    plate: "AAA111",
    make: "Toyota",
    model: "Corolla",
    vehicle_year: 2024,
    color: null,
    mileage: null,
    vin: null,
    notes: null,
    created_at: "2026-09-23T12:00:00.000Z",
    updated_at: "2026-09-23T12:00:00.000Z",
    clients: {
      id: clientA,
      workshop_id: "workshop-a",
      full_name: "Cliente A",
      phone: null,
      whatsapp_phone: null,
    },
  },
  {
    id: "vehicle-b",
    workshop_id: "workshop-b",
    client_id: clientB,
    vehicle_label: "Ford Fiesta 2023 - BBB222",
    plate: "BBB222",
    make: "Ford",
    model: "Fiesta",
    vehicle_year: 2023,
    color: null,
    mileage: null,
    vin: null,
    notes: null,
    created_at: "2026-09-23T12:00:00.000Z",
    updated_at: "2026-09-23T12:00:00.000Z",
    clients: {
      id: clientB,
      workshop_id: "workshop-b",
      full_name: "Cliente B",
      phone: null,
      whatsapp_phone: null,
    },
  },
] as Array<Record<string, unknown>>;

let currentSubject: WorkshopOperationSubject | null = null;
let savedVehicles: Array<Record<string, unknown>> = [];

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
    if (deleting || insertedValue) {
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
    limit() {
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
            id: "vehicle-new",
            created_at: "2026-09-23T12:00:00.000Z",
            updated_at: "2026-09-23T12:00:00.000Z",
            ...value,
          }
        : matchingRows().map((row) => ({ ...row, ...updateValue }))[0] ?? null;

      if (table === "vehicles" && data) {
        savedVehicles.push(data);
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

const { getVehicleDetail, getVehiclesList } = await import("@/lib/data/vehicles");
const { saveVehicleAction } = await import("@/app/actions/vehicles");

function validVehicle(clientId = clientA) {
  return {
    clientId,
    make: "Toyota",
    model: "Corolla",
    year: "2024",
    plate: "AAA111",
    color: "",
    mileage: "",
    vin: "",
    notes: "",
    photoUrls: [],
  };
}

beforeEach(() => {
  currentSubject = null;
  savedVehicles = [];
});

test("una invocacion directa de mecanico no puede leer ni guardar vehiculos", async () => {
  currentSubject = {
    role: "mechanic",
    isActive: true,
    mechanicId: "mechanic-a",
  };

  await rejects(() => getVehiclesList(), /No tienes permiso/);
  deepStrictEqual(await saveVehicleAction(validVehicle()), {
    success: false,
    message: "No se pudo guardar el vehiculo.",
  });
  equal(savedVehicles.length, 0);
});

test("una invocacion directa de miembro inactivo falla cerrada", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: false,
    mechanicId: null,
  };

  deepStrictEqual(await saveVehicleAction(validVehicle()), {
    success: false,
    message: "No se pudo guardar el vehiculo.",
  });
  equal(savedVehicles.length, 0);
});

test("los IDs relacionados de otro taller no se pueden usar", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: true,
    mechanicId: null,
  };

  await rejects(() => getVehicleDetail("vehicle-b"), /not found/);
  deepStrictEqual(await saveVehicleAction(validVehicle(clientB)), {
    success: false,
    message: "El cliente seleccionado no esta disponible.",
  });
  deepStrictEqual(await saveVehicleAction(validVehicle(), "vehicle-b"), {
    success: false,
    message: "El vehiculo seleccionado no esta disponible.",
  });
  equal(savedVehicles.length, 0);
});

test("finanzas autorizado puede leer y guardar vehiculos del taller", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: true,
    mechanicId: null,
  };

  const vehicles = await getVehiclesList();
  equal(vehicles.length, 1);
  equal(vehicles[0]?.id, "vehicle-a");
  equal(vehicles[0]?.owner?.full_name, "Cliente A");
  equal("workshop_id" in (vehicles[0]?.owner ?? {}), false);
  deepStrictEqual(await saveVehicleAction(validVehicle()), {
    success: true,
    message: "Vehiculo guardado.",
    vehicleId: "vehicle-new",
  });
  equal(savedVehicles.length, 1);
});
