import { equal, rejects } from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";

import {
  assertWorkshopOperationAllowed,
  type WorkshopOperation,
  type WorkshopOperationSubject,
} from "@/lib/permissions";

const workshop = {
  id: "workshop-a",
  public_slug: "taller-a",
};
const inquiryRows = [
  {
    id: "inquiry-a",
    workshop_id: "workshop-a",
    requester_name: "Cliente A",
    requester_phone: "+58000000001",
    requester_city: null,
    requested_service: "Mantenimiento general",
    vehicle_reference: null,
    preferred_contact: "whatsapp",
    message: "Necesito revisar el vehiculo.",
    source: "public_marketplace",
    status: "new",
    created_at: "2026-09-23T12:00:00.000Z",
    updated_at: "2026-09-23T12:00:00.000Z",
  },
  {
    id: "inquiry-b",
    workshop_id: "workshop-b",
    requester_name: "Cliente B",
    requester_phone: "+58000000002",
    requester_city: null,
    requested_service: "Mantenimiento general",
    vehicle_reference: null,
    preferred_contact: "whatsapp",
    message: "Necesito revisar otro vehiculo.",
    source: "public_marketplace",
    status: "new",
    created_at: "2026-09-23T12:00:00.000Z",
    updated_at: "2026-09-23T12:00:00.000Z",
  },
] as Array<Record<string, unknown>>;
const reviewRows = [
  {
    id: "review-a",
    workshop_id: "workshop-a",
    reviewer_name: "Cliente A",
    title: "Buen servicio",
    rating: 5,
    comment: "Atencion rapida y clara.",
    workshop_response: null,
    workshop_response_at: null,
    created_at: "2026-09-23T12:00:00.000Z",
    published_at: "2026-09-23T12:00:00.000Z",
    status: "approved",
  },
  {
    id: "review-b",
    workshop_id: "workshop-b",
    reviewer_name: "Cliente B",
    title: "Otro taller",
    rating: 4,
    comment: "Resena de otro taller.",
    workshop_response: null,
    workshop_response_at: null,
    created_at: "2026-09-23T12:00:00.000Z",
    published_at: "2026-09-23T12:00:00.000Z",
    status: "approved",
  },
] as Array<Record<string, unknown>>;

let currentSubject: WorkshopOperationSubject | null = null;
let updatedInquiryIds: string[] = [];
let updatedReviewIds: string[] = [];

function createQuery(table: string) {
  const filters: Record<string, unknown> = {};
  const inFilters: Record<string, unknown[]> = {};
  let updateValue: Record<string, unknown> | null = null;

  function tableRows(): Array<Record<string, unknown>> {
    if (table === "marketplace_inquiries") {
      return inquiryRows;
    }

    if (table === "workshop_reviews") {
      return reviewRows;
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
    not() {
      return query;
    },
    or() {
      return query;
    },
    contains() {
      return query;
    },
    order() {
      return query;
    },
    limit() {
      return query;
    },
    update(value: Record<string, unknown>) {
      updateValue = value;
      return query;
    },
    insert() {
      return query;
    },
    async maybeSingle() {
      const row = matchingRows()[0] ?? null;
      const data = row && updateValue ? { ...row, ...updateValue } : row;

      if (data && updateValue && table === "marketplace_inquiries") {
        updatedInquiryIds.push(data.id as string);
      }

      if (data && updateValue && table === "workshop_reviews") {
        updatedReviewIds.push(data.id as string);
      }

      return { data, error: null };
    },
    async single() {
      return { data: matchingRows()[0] ?? null, error: null };
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

mock.module("@/lib/data/appointments", {
  namedExports: {
    async upsertAppointment() {
      return { id: "appointment-a" };
    },
  },
});

mock.module("@/lib/notifications/email", {
  namedExports: {
    async sendOwnerAppointmentConfirmedEmail() {},
    async sendWorkshopInquiryEmail() {},
  },
});

mock.module("next/cache", {
  namedExports: {
    revalidatePath() {},
  },
});

const {
  getMarketplaceDirectory,
  getWorkshopNotifications,
  getWorkshopReviewsForAdmin,
} = await import("@/lib/data/marketplace");
const {
  confirmAndScheduleMarketplaceInquiryAction,
  markMarketplaceInquiryAsContactedAction,
  respondToWorkshopReviewAction,
} = await import("@/app/actions/marketplace");

function reviewResponseFormData() {
  const formData = new FormData();
  formData.set("response", "Gracias por compartir tu experiencia.");
  return formData;
}

beforeEach(() => {
  currentSubject = null;
  updatedInquiryIds = [];
  updatedReviewIds = [];
});

test("el directorio publico permanece disponible sin sesion", async () => {
  const directory = await getMarketplaceDirectory({});
  equal(directory.total, 0);
});

test("una invocacion directa de mecanico no puede leer ni gestionar marketplace", async () => {
  currentSubject = {
    role: "mechanic",
    isActive: true,
    mechanicId: "mechanic-a",
  };

  await rejects(() => getWorkshopNotifications("workshop-a"), /No tienes permiso/);
  await rejects(
    () => markMarketplaceInquiryAsContactedAction("inquiry-a"),
    /No se pudo actualizar la solicitud/,
  );
  equal(updatedInquiryIds.length, 0);
});

test("una invocacion directa de miembro inactivo falla cerrada", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: false,
    mechanicId: null,
  };

  await rejects(
    () => markMarketplaceInquiryAsContactedAction("inquiry-a"),
    /No se pudo actualizar la solicitud/,
  );
  equal(updatedInquiryIds.length, 0);
});

test("taller, solicitud y resena de otro taller no se pueden usar", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: true,
    mechanicId: null,
  };

  await rejects(
    () => getWorkshopNotifications("workshop-b"),
    /El taller seleccionado no esta disponible/,
  );
  await rejects(
    () => markMarketplaceInquiryAsContactedAction("inquiry-b"),
    /La solicitud seleccionada no esta disponible/,
  );
  await rejects(
    () => confirmAndScheduleMarketplaceInquiryAction("inquiry-b"),
    /La solicitud seleccionada no esta disponible/,
  );
  await rejects(
    () => respondToWorkshopReviewAction("review-b", reviewResponseFormData()),
    /La resena seleccionada no esta disponible/,
  );
  equal(updatedInquiryIds.length, 0);
  equal(updatedReviewIds.length, 0);
});

test("finanzas autorizado puede leer y gestionar marketplace del taller", async () => {
  currentSubject = {
    role: "finanzas",
    isActive: true,
    mechanicId: null,
  };

  const notifications = await getWorkshopNotifications("workshop-a");
  const reviews = await getWorkshopReviewsForAdmin("workshop-a");
  equal(notifications.length, 1);
  equal(reviews.length, 1);

  await markMarketplaceInquiryAsContactedAction("inquiry-a");
  await respondToWorkshopReviewAction("review-a", reviewResponseFormData());
  equal(updatedInquiryIds.includes("inquiry-a"), true);
  equal(updatedReviewIds.includes("review-a"), true);
});
