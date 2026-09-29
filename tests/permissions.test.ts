import { doesNotThrow, equal, throws } from "node:assert/strict";
import { test } from "node:test";

import {
  assertWorkshopOperationAllowed,
  canManageWorkOrders,
  canViewWorkOrderPrices,
  hasModuleAccess,
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
  doesNotThrow(() =>
    assertWorkshopOperationAllowed(financeMember, "work_orders.view"),
  );
  equal(canManageWorkOrders("finanzas"), false);
  equal(canViewWorkOrderPrices("finanzas"), true);
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

test("las vistas autenticadas no muestran precios al mecanico", () => {
  equal(canViewWorkOrderPrices("mechanic"), false);
  equal(canViewWorkOrderPrices("owner"), true);
  equal(canViewWorkOrderPrices("admin"), true);
  equal(canViewWorkOrderPrices("finanzas"), true);
});

test("documentos internos quedan fuera de recepción y mecánico", () => {
  for (const role of ["recepcion", "mechanic"] as const) {
    throws(
      () => assertWorkshopOperationAllowed({ role, isActive: true, mechanicId: role === "mechanic" ? "mechanic-1" : null }, "documents.internal"),
      (error) => error instanceof WorkshopOperationDeniedError && error.reason === "role_not_allowed",
    );
  }

  for (const role of ["owner", "admin", "finanzas"] as const) {
    doesNotThrow(() => assertWorkshopOperationAllowed({ role, isActive: true, mechanicId: null }, "documents.internal"));
  }
});

test("el documento mecánico exige asignación cuando el rol es mecánico", () => {
  const mechanic: WorkshopOperationSubject = { role: "mechanic", isActive: true, mechanicId: "mechanic-1" };
  doesNotThrow(() => assertWorkshopOperationAllowed(mechanic, "documents.mechanic", { assignedMechanicId: "mechanic-1" }));
  throws(
    () => assertWorkshopOperationAllowed(mechanic, "documents.mechanic", { assignedMechanicId: "mechanic-2" }),
    (error) => error instanceof WorkshopOperationDeniedError && error.reason === "work_order_not_assigned",
  );
});

test("el shell del mecanico carga sus modulos sin consultar notificaciones", () => {
  equal(hasModuleAccess("mechanic", "dashboard"), true);
  equal(hasModuleAccess("mechanic", "work_orders"), true);
  equal(hasModuleAccess("mechanic", "calendar"), true);
  equal(hasModuleAccess("mechanic", "notifications"), false);
});

test("jefe de taller gestiona operacion pero no clientes ni cotizaciones", () => {
  const workshopLead: WorkshopOperationSubject = {
    role: "jefe_taller",
    isActive: true,
    mechanicId: null,
  };

  doesNotThrow(() =>
    assertWorkshopOperationAllowed(workshopLead, "work_orders.manage"),
  );
  doesNotThrow(() =>
    assertWorkshopOperationAllowed(workshopLead, "mechanics.manage"),
  );
  throws(
    () => assertWorkshopOperationAllowed(workshopLead, "clients.view"),
    (error) =>
      error instanceof WorkshopOperationDeniedError &&
      error.reason === "role_not_allowed",
  );
});

test("finanzas solo lee marketplace y citas", () => {
  const financeMember: WorkshopOperationSubject = {
    role: "finanzas",
    isActive: true,
    mechanicId: null,
  };

  doesNotThrow(() =>
    assertWorkshopOperationAllowed(financeMember, "marketplace.view"),
  );
  doesNotThrow(() =>
    assertWorkshopOperationAllowed(financeMember, "appointments.view"),
  );
  throws(
    () => assertWorkshopOperationAllowed(financeMember, "marketplace.manage"),
    (error) =>
      error instanceof WorkshopOperationDeniedError &&
      error.reason === "role_not_allowed",
  );
  throws(
    () => assertWorkshopOperationAllowed(financeMember, "appointments.manage"),
    (error) =>
      error instanceof WorkshopOperationDeniedError &&
      error.reason === "role_not_allowed",
  );
});
