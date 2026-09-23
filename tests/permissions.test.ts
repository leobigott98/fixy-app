import { doesNotThrow, throws } from "node:assert/strict";
import { test } from "node:test";

import {
  assertWorkshopOperationAllowed,
  WorkshopOperationDeniedError,
  type WorkshopOperationSubject,
} from "@/lib/permissions";

const activeReceptionist: WorkshopOperationSubject = {
  role: "recepcion",
  isActive: true,
  mechanicId: null,
};

test("deniega a una sesion anonima", () => {
  throws(
    () => assertWorkshopOperationAllowed(null, "quotes.manage"),
    (error) =>
      error instanceof WorkshopOperationDeniedError &&
      error.reason === "anonymous",
  );
});

test("deniega a un miembro inactivo", () => {
  const inactiveMember: WorkshopOperationSubject = {
    ...activeReceptionist,
    isActive: false,
  };

  throws(
    () => assertWorkshopOperationAllowed(inactiveMember, "clients.manage"),
    (error) =>
      error instanceof WorkshopOperationDeniedError &&
      error.reason === "inactive_member",
  );
});

test("deniega una operacion no permitida para el rol", () => {
  const financeMember: WorkshopOperationSubject = {
    role: "finanzas",
    isActive: true,
    mechanicId: null,
  };

  throws(
    () => assertWorkshopOperationAllowed(financeMember, "work_orders.manage"),
    (error) =>
      error instanceof WorkshopOperationDeniedError &&
      error.reason === "role_not_allowed",
  );
});

test("permite una operacion configurada para el rol", () => {
  doesNotThrow(() =>
    assertWorkshopOperationAllowed(activeReceptionist, "work_orders.manage"),
  );
});

test("finanzas puede registrar pagos y gastos", () => {
  const financeMember: WorkshopOperationSubject = {
    role: "finanzas",
    isActive: true,
    mechanicId: null,
  };

  doesNotThrow(() =>
    assertWorkshopOperationAllowed(financeMember, "payments.record"),
  );
  doesNotThrow(() =>
    assertWorkshopOperationAllowed(financeMember, "expenses.record"),
  );
});

test("el mecanico solo consulta una orden asignada", () => {
  const mechanic: WorkshopOperationSubject = {
    role: "mechanic",
    isActive: true,
    mechanicId: "mechanic-1",
  };

  throws(
    () =>
      assertWorkshopOperationAllowed(mechanic, "work_orders.view", {
        assignedMechanicId: "mechanic-2",
      }),
    (error) =>
      error instanceof WorkshopOperationDeniedError &&
      error.reason === "work_order_not_assigned",
  );
  doesNotThrow(() =>
    assertWorkshopOperationAllowed(mechanic, "work_orders.view", {
      assignedMechanicId: "mechanic-1",
    }),
  );
});

test("el mecanico no puede registrar dinero", () => {
  const mechanic: WorkshopOperationSubject = {
    role: "mechanic",
    isActive: true,
    mechanicId: "mechanic-1",
  };

  throws(
    () => assertWorkshopOperationAllowed(mechanic, "payments.record"),
    (error) =>
      error instanceof WorkshopOperationDeniedError &&
      error.reason === "role_not_allowed",
  );
});
