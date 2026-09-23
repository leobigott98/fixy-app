import { deepStrictEqual, equal, rejects } from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";

import {
  assertWorkshopOperationAllowed,
  type WorkshopOperation,
  type WorkshopOperationSubject,
} from "@/lib/permissions";

const workshop = { id: "workshop-a" };
const supplierRows = [
  {
    id: "supplier-a",
    workshop_id: "workshop-a",
    name: "Proveedor A",
    phone: null,
    notes: null,
    created_at: "2026-09-15T12:00:00.000Z",
    updated_at: "2026-09-15T12:00:00.000Z",
  },
  {
    id: "supplier-b",
    workshop_id: "workshop-b",
    name: "Proveedor B",
    phone: null,
    notes: null,
    created_at: "2026-09-15T12:00:00.000Z",
    updated_at: "2026-09-15T12:00:00.000Z",
  },
] as Array<Record<string, unknown>>;

let currentSubject: WorkshopOperationSubject | null = null;
let savedSuppliers: Array<Record<string, unknown>> = [];

function createQuery(table: string) {
  const filters: Record<string, unknown> = {};
  let insertedValue: Record<string, unknown> | null = null;
  let updateValue: Record<string, unknown> | null = null;

  function matchingRows() {
    const rows = table === "suppliers" ? supplierRows : [];
    return rows.filter((row) =>
      Object.entries(filters).every(([column, value]) => row[column] === value),
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
    in() {
      return query;
    },
    or() {
      return query;
    },
    order() {
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
            id: "supplier-new",
            created_at: "2026-09-15T12:00:00.000Z",
            updated_at: "2026-09-15T12:00:00.000Z",
            ...insertedValue,
          }
        : matchingRows().map((row) => ({ ...row, ...updateValue }))[0] ?? null;

      if (table === "suppliers" && data) {
        savedSuppliers.push(data);
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

const { getSuppliersList } = await import("@/lib/data/suppliers");
const { saveSupplierAction } = await import("@/app/actions/suppliers");

const validSupplier = {
  name: "Proveedor nuevo",
  phone: "",
  notes: "",
};

beforeEach(() => {
  currentSubject = null;
  savedSuppliers = [];
});

test("una invocacion directa de mecanico no puede leer ni guardar proveedores", async () => {
  currentSubject = {
    role: "mechanic",
    isActive: true,
    mechanicId: "mechanic-a",
  };

  await rejects(() => getSuppliersList(), /No tienes permiso/);
  deepStrictEqual(await saveSupplierAction(validSupplier), {
    success: false,
    message: "No se pudo guardar el proveedor.",
  });
  equal(savedSuppliers.length, 0);
});

test("una invocacion directa de miembro inactivo falla cerrada", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: false,
    mechanicId: null,
  };

  deepStrictEqual(await saveSupplierAction(validSupplier), {
    success: false,
    message: "No se pudo guardar el proveedor.",
  });
  equal(savedSuppliers.length, 0);
});

test("un supplierId de otro taller no se puede usar", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: true,
    mechanicId: null,
  };

  deepStrictEqual(await saveSupplierAction(validSupplier, "supplier-b"), {
    success: false,
    message: "El proveedor seleccionado no esta disponible.",
  });
  equal(savedSuppliers.length, 0);
});

test("finanzas autorizado puede guardar proveedores", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: true,
    mechanicId: null,
  };

  deepStrictEqual(await saveSupplierAction(validSupplier), {
    success: true,
    message: "Proveedor guardado.",
    supplierId: "supplier-new",
  });
  equal(savedSuppliers.length, 1);
});
