import {
  deepStrictEqual,
  equal,
  rejects,
} from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";

import {
  assertWorkshopOperationAllowed,
  type WorkshopOperation,
  type WorkshopOperationSubject,
} from "@/lib/permissions";

const workshop = { id: "workshop-a" };
const rows = {
  clients: [
    { id: "client-a", workshop_id: "workshop-a" },
    { id: "client-b", workshop_id: "workshop-b" },
  ],
  work_orders: [
    {
      id: "work-order-b",
      workshop_id: "workshop-b",
      client_id: "client-b",
      status: "received",
    },
  ] as Array<Record<string, unknown>>,
};

let currentSubject: WorkshopOperationSubject | null = null;
let insertedPayments: Array<Record<string, unknown>> = [];
let insertedExpenses: Array<Record<string, unknown>> = [];
let revalidatedPaths: string[] = [];

function createQuery(table: string) {
  const filters: Record<string, unknown> = {};
  let insertedValue: Record<string, unknown> | Array<Record<string, unknown>> | null = null;

  const query = {
    select() {
      return query;
    },
    eq(column: string, value: unknown) {
      filters[column] = value;
      return query;
    },
    neq() {
      return query;
    },
    order() {
      return query;
    },
    insert(value: Record<string, unknown> | Array<Record<string, unknown>>) {
      insertedValue = value;
      return query;
    },
    async maybeSingle() {
      const tableRows = table === "clients" ? rows.clients : rows.work_orders;
      const data = tableRows.find((row) =>
        Object.entries(filters).every(([column, value]) => row[column] === value),
      );

      return { data: data ?? null, error: null };
    },
    async single() {
      const value = Array.isArray(insertedValue) ? insertedValue[0] : insertedValue;
      const data = {
        id: `${table}-1`,
        ...(value ?? {}),
        currency: "USD",
        quote_id: null,
        created_at: "2026-09-15T12:00:00.000Z",
      };

      if (table === "payments") {
        insertedPayments.push(data);
      }

      if (table === "expenses") {
        insertedExpenses.push(data);
      }

      return { data, error: null };
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
    revalidatePath(path: string) {
      revalidatedPaths.push(path);
    },
  },
});

const { getFinancesOverview } = await import("@/lib/data/finances");
const { createExpenseAction, recordPaymentAction } = await import("@/app/actions/finances");

const validPayment = {
  clientId: "client-a",
  workOrderId: "",
  amount: "100.00",
  status: "paid" as const,
  method: "cash" as const,
  date: "2026-09-15",
  notes: "",
  proofUrl: "",
};

const validExpense = {
  workOrderId: "",
  amount: "25.00",
  category: "operacion" as const,
  date: "2026-09-15",
  notes: "",
  assetUrls: [],
};

beforeEach(() => {
  currentSubject = null;
  insertedPayments = [];
  insertedExpenses = [];
  revalidatedPaths = [];
});

test("una invocacion directa de mecanico no puede leer ni registrar pagos", async () => {
  currentSubject = {
    role: "mechanic",
    isActive: true,
    mechanicId: "mechanic-a",
  };

  await rejects(() => getFinancesOverview(), /No tienes permiso/);

  deepStrictEqual(await recordPaymentAction(validPayment), {
    success: false,
    message: "No se pudo registrar el pago.",
  });
  equal(insertedPayments.length, 0);
});

test("una invocacion directa de miembro inactivo falla cerrada", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: false,
    mechanicId: null,
  };

  deepStrictEqual(await recordPaymentAction(validPayment), {
    success: false,
    message: "No se pudo registrar el pago.",
  });
  equal(insertedPayments.length, 0);
});

test("IDs relacionados de otro taller no se pueden usar", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: true,
    mechanicId: null,
  };

  deepStrictEqual(
    await recordPaymentAction({ ...validPayment, clientId: "client-b" }),
    {
      success: false,
      message: "El cliente seleccionado no esta disponible.",
    },
  );
  deepStrictEqual(
    await recordPaymentAction({
      ...validPayment,
      workOrderId: "work-order-b",
    }),
    {
      success: false,
      message: "La orden seleccionada no esta disponible.",
    },
  );
  deepStrictEqual(
    await createExpenseAction({
      ...validExpense,
      workOrderId: "work-order-b",
    }),
    {
      success: false,
      message: "La orden vinculada no esta disponible.",
    },
  );
  equal(insertedPayments.length, 0);
  equal(insertedExpenses.length, 0);
});

test("finanzas autorizado puede registrar pagos y gastos", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: true,
    mechanicId: null,
  };

  deepStrictEqual(await recordPaymentAction(validPayment), {
    success: true,
    message: "Pago registrado.",
  });
  deepStrictEqual(await createExpenseAction(validExpense), {
    success: true,
    message: "Gasto registrado.",
  });
  equal(insertedPayments.length, 1);
  equal(insertedExpenses.length, 1);
  equal(revalidatedPaths.includes("/app/finances"), true);
});
