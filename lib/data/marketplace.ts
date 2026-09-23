import { createSupabaseDataClient, isMissingRelationError } from "@/lib/data/core";
import {
  marketplaceInquirySchema,
  marketplaceReviewSchema,
  workshopReviewResponseSchema,
  type MarketplaceInquiryInput,
  type MarketplaceReviewInput,
  type WorkshopReviewResponseInput,
} from "@/lib/marketplace/schema";
import { normalizeSessionPhone } from "@/lib/auth/session-utils";
import { upsertAppointment } from "@/lib/data/appointments";
import { requireWorkshopOperation, type WorkshopRecord } from "@/lib/data/workshops";
import { sendOwnerAppointmentConfirmedEmail, sendWorkshopInquiryEmail } from "@/lib/notifications/email";
import { slugifyWorkshopPublicSlug } from "@/lib/workshops/schema";
import { buildVehicleLabel } from "@/lib/vehicles/schema";

type PublicWorkshopBase = Pick<
  WorkshopRecord,
  | "id"
  | "owner_email"
  | "workshop_name"
  | "city"
  | "workshop_type"
  | "opening_hours_label"
  | "logo_url"
  | "gallery_image_urls"
  | "public_slug"
  | "public_services"
  | "public_description"
  | "public_address"
  | "public_contact_phone"
  | "public_contact_email"
  | "whatsapp_phone"
  | "profile_visibility"
  | "verification_status"
  | "created_at"
>;

type WorkshopReviewRow = {
  id: string;
  workshop_id: string;
  reviewer_name: string;
  title: string;
  rating: number;
  comment: string | null;
  workshop_response: string | null;
  workshop_response_at: string | null;
  created_at: string;
  published_at: string | null;
  status: "pending" | "approved" | "hidden";
};

type MarketplaceInquiryRow = {
  id: string;
  workshop_id: string;
  requester_name: string;
  requester_phone: string;
  requester_city: string | null;
  requested_service: string;
  vehicle_reference: string | null;
  preferred_contact: "whatsapp" | "llamada";
  message: string;
  source: string;
  status: "new" | "contacted" | "closed";
  created_at: string;
  updated_at: string;
};

type OwnerAppointmentRequestRow = {
  id: string;
  workshop_id: string;
  owner_profile_id: string;
  owner_vehicle_id: string | null;
  marketplace_inquiry_id: string | null;
  requested_date: string;
  requested_time: string;
  service_needed: string;
  issue_summary: string;
  contact_channel: "whatsapp" | "llamada" | "correo";
  status: "solicitada" | "confirmada" | "completada" | "cancelada";
  workshop_response_note: string | null;
};

type OwnerProfileRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
};

type OwnerVehicleRow = {
  id: string;
  owner_profile_id: string;
  nickname: string | null;
  plate: string | null;
  make: string;
  model: string;
  vehicle_year: number | null;
  color: string | null;
  mileage: number | null;
  vin: string | null;
  photo_urls: string[] | null;
  notes: string | null;
};

export type MarketplaceReviewSummary = {
  totalApproved: number;
  averageRating: number | null;
};

export type MarketplaceReviewCard = {
  id: string;
  reviewerName: string;
  title: string;
  rating: number;
  comment: string | null;
  workshopResponse: string | null;
  workshopResponseAt: string | null;
  publishedAt: string | null;
};

export type MarketplaceWorkshopListItem = PublicWorkshopBase & {
  reviewSummary: MarketplaceReviewSummary;
};

export type MarketplaceWorkshopDetail = MarketplaceWorkshopListItem & {
  recentReviews: MarketplaceReviewCard[];
};

export type MarketplaceDirectoryFilters = {
  query?: string;
  location?: string;
  service?: string;
};

export type MarketplaceDirectoryResult = {
  workshops: MarketplaceWorkshopListItem[];
  locations: string[];
  total: number;
};

export type WorkshopNotificationItem = {
  id: string;
  workshopId: string;
  requesterName: string;
  requesterPhone: string;
  requesterCity: string | null;
  requestedService: string;
  vehicleReference: string | null;
  preferredContact: "whatsapp" | "llamada";
  requesterEmail: string | null;
  message: string;
  source: string;
  status: "new" | "contacted" | "closed";
  createdAt: string;
  requestedDate: string | null;
  requestedTime: string | null;
  ownerAppointmentRequestId: string | null;
  ownerAppointmentStatus: "solicitada" | "confirmada" | "completada" | "cancelada" | null;
  workshopResponseNote: string | null;
  canConfirmAndSchedule: boolean;
};

export type WorkshopReviewManagementItem = {
  id: string;
  reviewerName: string;
  title: string;
  rating: number;
  comment: string | null;
  workshopResponse: string | null;
  workshopResponseAt: string | null;
  publishedAt: string | null;
};

export type MarketplaceInputErrorCode =
  | "workshop_not_available"
  | "inquiry_not_available"
  | "review_not_available"
  | "inquiry_not_schedulable"
  | "invalid_inquiry"
  | "invalid_review"
  | "invalid_review_response";

export class MarketplaceInputError extends Error {
  readonly code: MarketplaceInputErrorCode;

  constructor(code: MarketplaceInputErrorCode) {
    const messages: Record<MarketplaceInputErrorCode, string> = {
      workshop_not_available: "El taller seleccionado no esta disponible.",
      inquiry_not_available: "La solicitud seleccionada no esta disponible.",
      review_not_available: "La resena seleccionada no esta disponible.",
      inquiry_not_schedulable: "La solicitud no se puede confirmar y agendar.",
      invalid_inquiry: "Revisa los datos de tu solicitud.",
      invalid_review: "Revisa tu resena antes de enviarla.",
      invalid_review_response: "Revisa la respuesta antes de guardarla.",
    };

    super(messages[code]);
    this.name = "MarketplaceInputError";
    this.code = code;
  }
}

class MarketplaceDataError extends Error {
  constructor(message: string, cause: unknown) {
    super(message, { cause });
    this.name = "MarketplaceDataError";
  }
}

async function requireMarketplaceWorkshop(
  operation: "marketplace.view" | "marketplace.manage",
  requestedWorkshopId: string,
) {
  const { workshop } = await requireWorkshopOperation(operation);

  if (requestedWorkshopId !== workshop.id) {
    throw new MarketplaceInputError("workshop_not_available");
  }

  return workshop;
}

function emptyReviewSummary(): MarketplaceReviewSummary {
  return {
    totalApproved: 0,
    averageRating: null,
  };
}

function formatAppointmentDate(dateValue: string) {
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
  }).format(new Date(`${dateValue}T12:00:00`));
}

function formatAppointmentTime(timeValue: string) {
  return timeValue.slice(0, 5);
}

async function getReviewSummaryMap(workshopIds: string[]) {
  if (!workshopIds.length) {
    return new Map<string, MarketplaceReviewSummary>();
  }

  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("workshop_reviews")
    .select("workshop_id,rating,status")
    .in("workshop_id", workshopIds)
    .eq("status", "approved");

  if (error) {
    if (isMissingRelationError(error)) {
      return new Map<string, MarketplaceReviewSummary>();
    }

    throw new MarketplaceDataError("No se pudo cargar el resumen de resenas.", error);
  }

  const grouped = new Map<string, { total: number; sum: number }>();

  (((data as Array<Pick<WorkshopReviewRow, "workshop_id" | "rating" | "status">>) ?? [])).forEach(
    (review) => {
      const current = grouped.get(review.workshop_id) ?? { total: 0, sum: 0 };
      current.total += 1;
      current.sum += Number(review.rating);
      grouped.set(review.workshop_id, current);
    },
  );

  return new Map(
    Array.from(grouped.entries()).map(([workshopId, values]) => [
      workshopId,
      {
        totalApproved: values.total,
        averageRating: Number((values.sum / values.total).toFixed(1)),
      },
    ]),
  );
}

async function getRecentApprovedReviews(workshopId: string) {
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("workshop_reviews")
    .select("id,reviewer_name,title,rating,comment,workshop_response,workshop_response_at,published_at,created_at,status")
    .eq("workshop_id", workshopId)
    .eq("status", "approved")
    .order("published_at", { ascending: false })
    .limit(3);

  if (error) {
    if (isMissingRelationError(error)) {
      return [] as MarketplaceReviewCard[];
    }

    throw new MarketplaceDataError("No se pudieron cargar las resenas recientes.", error);
  }

  return (((data as WorkshopReviewRow[] | null) ?? []).map((review) => ({
    id: review.id,
    reviewerName: review.reviewer_name,
    title: review.title,
    rating: Number(review.rating),
    comment: review.comment,
    workshopResponse: review.workshop_response,
    workshopResponseAt: review.workshop_response_at,
    publishedAt: review.published_at ?? review.created_at,
  })));
}

export async function getMarketplaceDirectory(
  filters: MarketplaceDirectoryFilters,
): Promise<MarketplaceDirectoryResult> {
  const supabase = await createSupabaseDataClient();
  const trimmedQuery = filters.query?.trim();
  const trimmedLocation = filters.location?.trim();
  const trimmedService = filters.service?.trim();

  let directoryQuery = supabase
    .from("workshops")
    .select(
      "id,owner_email,workshop_name,city,workshop_type,opening_hours_label,logo_url,gallery_image_urls,public_slug,public_services,public_description,public_address,public_contact_phone,public_contact_email,whatsapp_phone,profile_visibility,verification_status,created_at",
    )
    .eq("profile_visibility", "public")
    .not("public_slug", "is", null);

  if (trimmedQuery) {
    directoryQuery = directoryQuery.or(
      `workshop_name.ilike.%${trimmedQuery}%,city.ilike.%${trimmedQuery}%,public_description.ilike.%${trimmedQuery}%`,
    );
  }

  if (trimmedLocation) {
    directoryQuery = directoryQuery.eq("city", trimmedLocation);
  }

  if (trimmedService) {
    directoryQuery = directoryQuery.contains("public_services", [trimmedService]);
  }

  const [{ data, error }, { data: locationData, error: locationsError }] = await Promise.all([
    directoryQuery.order("workshop_name", { ascending: true }).limit(24),
    supabase
      .from("workshops")
      .select("city")
      .eq("profile_visibility", "public")
      .not("public_slug", "is", null),
  ]);

  if (error) {
    if (isMissingRelationError(error)) {
      return { workshops: [], locations: [], total: 0 };
    }

    throw new MarketplaceDataError("No se pudo cargar el directorio de talleres.", error);
  }

  if (locationsError) {
    if (!isMissingRelationError(locationsError)) {
      throw new MarketplaceDataError("No se pudieron cargar las ubicaciones disponibles.", locationsError);
    }
  }

  const workshops = ((data as PublicWorkshopBase[] | null) ?? []).map((workshop) => ({
    ...workshop,
    public_slug: workshop.public_slug ?? slugifyWorkshopPublicSlug(workshop.workshop_name),
  }));
  const reviewSummaryMap = await getReviewSummaryMap(workshops.map((workshop) => workshop.id));
  const locations = Array.from(
    new Set(
      (((locationData as Array<{ city: string | null }> | null) ?? [])
        .map((item) => item.city?.trim())
        .filter(Boolean) as string[]),
    ),
  ).sort((left, right) => left.localeCompare(right, "es"));

  return {
    workshops: workshops.map((workshop) => ({
      ...workshop,
      reviewSummary: reviewSummaryMap.get(workshop.id) ?? emptyReviewSummary(),
    })),
    locations,
    total: workshops.length,
  };
}

export async function getMarketplaceWorkshopDetailBySlug(slug: string) {
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("workshops")
    .select(
      "id,owner_email,workshop_name,city,workshop_type,opening_hours_label,logo_url,gallery_image_urls,public_slug,public_services,public_description,public_address,public_contact_phone,public_contact_email,whatsapp_phone,profile_visibility,verification_status,created_at",
    )
    .eq("public_slug", slugifyWorkshopPublicSlug(slug))
    .eq("profile_visibility", "public")
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw new MarketplaceDataError("No se pudo cargar el taller del marketplace.", error);
  }

  const workshop = (data as PublicWorkshopBase | null) ?? null;

  if (!workshop) {
    return null;
  }

  const reviewSummaryMap = await getReviewSummaryMap([workshop.id]);
  const recentReviews = await getRecentApprovedReviews(workshop.id);

  return {
    ...workshop,
    public_slug: workshop.public_slug ?? slugifyWorkshopPublicSlug(workshop.workshop_name),
    reviewSummary: reviewSummaryMap.get(workshop.id) ?? emptyReviewSummary(),
    recentReviews,
  } satisfies MarketplaceWorkshopDetail;
}

export async function createMarketplaceInquiry(
  workshopSlug: string,
  input: MarketplaceInquiryInput,
) {
  const parsedResult = marketplaceInquirySchema.safeParse(input);

  if (!parsedResult.success) {
    throw new MarketplaceInputError("invalid_inquiry");
  }

  const parsed = parsedResult.data;
  const workshop = await getMarketplaceWorkshopDetailBySlug(workshopSlug);

  if (!workshop) {
    throw new MarketplaceInputError("workshop_not_available");
  }

  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("marketplace_inquiries")
    .insert({
      workshop_id: workshop.id,
      requester_name: parsed.requesterName,
      requester_phone: parsed.requesterPhone,
      requester_city: parsed.requesterCity || null,
      requested_service: parsed.requestedService,
      vehicle_reference: parsed.vehicleReference || null,
      preferred_contact: parsed.preferredContact,
      message: parsed.message,
      source: "public_marketplace",
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      throw new MarketplaceDataError("No se pudo registrar la solicitud en este momento.", error);
    }

    throw new MarketplaceDataError("No se pudo registrar la solicitud en este momento.", error);
  }

  try {
    await sendWorkshopInquiryEmail({
      to: workshop.owner_email,
      workshopName: workshop.workshop_name,
      requesterName: parsed.requesterName,
      requesterPhone: parsed.requesterPhone,
      requesterCity: parsed.requesterCity || null,
      requestedService: parsed.requestedService,
      vehicleReference: parsed.vehicleReference || null,
      preferredContact: parsed.preferredContact,
      message: parsed.message,
    });
  } catch {
    // Inquiry persistence is the critical path; email is best-effort.
  }

  return {
    workshop,
    inquiry: data as MarketplaceInquiryRow,
  };
}

export async function getWorkshopNotificationCount(workshopId: string) {
  const workshop = await requireMarketplaceWorkshop("marketplace.view", workshopId);
  const supabase = await createSupabaseDataClient();
  const { count, error } = await supabase
    .from("marketplace_inquiries")
    .select("*", { count: "exact", head: true })
    .eq("workshop_id", workshop.id)
    .eq("status", "new");

  if (error) {
    if (isMissingRelationError(error)) {
      return 0;
    }

    throw new MarketplaceDataError("No se pudo cargar el conteo de notificaciones.", error);
  }

  return count ?? 0;
}

export async function getWorkshopNotifications(workshopId: string) {
  const workshop = await requireMarketplaceWorkshop("marketplace.view", workshopId);
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("marketplace_inquiries")
    .select("*")
    .eq("workshop_id", workshop.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    if (isMissingRelationError(error)) {
      return [] as WorkshopNotificationItem[];
    }

    throw new MarketplaceDataError("No se pudieron cargar las notificaciones.", error);
  }

  const inquiries = (data as MarketplaceInquiryRow[] | null) ?? [];

  if (!inquiries.length) {
    return [] as WorkshopNotificationItem[];
  }

  const inquiryIds = inquiries.map((item) => item.id);
  const { data: ownerAppointmentData, error: ownerAppointmentError } = await supabase
    .from("owner_appointment_requests")
    .select("*")
    .eq("workshop_id", workshop.id)
    .in("marketplace_inquiry_id", inquiryIds);

  if (ownerAppointmentError && !isMissingRelationError(ownerAppointmentError)) {
    throw new MarketplaceDataError("No se pudieron cargar las citas relacionadas.", ownerAppointmentError);
  }

  const ownerAppointments = (ownerAppointmentData as OwnerAppointmentRequestRow[] | null) ?? [];
  const ownerAppointmentMap = new Map(
    ownerAppointments
      .filter((item) => item.marketplace_inquiry_id)
      .map((item) => [item.marketplace_inquiry_id as string, item]),
  );

  const ownerProfileIds = Array.from(new Set(ownerAppointments.map((item) => item.owner_profile_id)));
  let ownerProfileMap = new Map<string, OwnerProfileRow>();

  if (ownerProfileIds.length) {
    const { data: ownerProfilesData, error: ownerProfilesError } = await supabase
      .from("owner_profiles")
      .select("id,full_name,email,phone")
      .in("id", ownerProfileIds);

    if (ownerProfilesError && !isMissingRelationError(ownerProfilesError)) {
      throw new MarketplaceDataError("No se pudieron cargar los propietarios relacionados.", ownerProfilesError);
    }

    ownerProfileMap = new Map(
      (((ownerProfilesData as OwnerProfileRow[] | null) ?? []).map((item) => [item.id, item])),
    );
  }

  return inquiries.map((item) => {
    const ownerAppointment = ownerAppointmentMap.get(item.id) ?? null;
    const ownerProfile = ownerAppointment
      ? ownerProfileMap.get(ownerAppointment.owner_profile_id) ?? null
      : null;

    return {
      id: item.id,
      workshopId: item.workshop_id,
      requesterName: item.requester_name,
      requesterPhone: item.requester_phone,
      requesterEmail: ownerProfile?.email ?? null,
      requesterCity: item.requester_city,
      requestedService: item.requested_service,
      vehicleReference: item.vehicle_reference,
      preferredContact: item.preferred_contact,
      message: item.message,
      source: item.source,
      status: item.status,
      createdAt: item.created_at,
      requestedDate: ownerAppointment?.requested_date ?? null,
      requestedTime: ownerAppointment?.requested_time ? formatAppointmentTime(ownerAppointment.requested_time) : null,
      ownerAppointmentRequestId: ownerAppointment?.id ?? null,
      ownerAppointmentStatus: ownerAppointment?.status ?? null,
      workshopResponseNote: ownerAppointment?.workshop_response_note ?? null,
      canConfirmAndSchedule: Boolean(
        ownerAppointment &&
          ownerAppointment.status === "solicitada" &&
          item.status !== "closed",
      ),
    } satisfies WorkshopNotificationItem;
  });
}

export async function markMarketplaceInquiryAsContacted(inquiryId: string, workshopId: string) {
  const workshop = await requireMarketplaceWorkshop("marketplace.manage", workshopId);
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("marketplace_inquiries")
    .update({ status: "contacted" })
    .eq("id", inquiryId)
    .eq("workshop_id", workshop.id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      throw new MarketplaceDataError("No se pudo actualizar la solicitud.", error);
    }

    throw new MarketplaceDataError("No se pudo actualizar la solicitud.", error);
  }

  if (!data) {
    throw new MarketplaceInputError("inquiry_not_available");
  }
}

async function findOrCreateClientFromOwnerRequest(params: {
  workshopId: string;
  requesterName: string;
  requesterPhone: string;
  requesterEmail?: string | null;
}) {
  const supabase = await createSupabaseDataClient();
  const normalizedPhone = normalizeSessionPhone(params.requesterPhone);
  const { data: existingClient, error: existingClientError } = await supabase
    .from("clients")
    .select("*")
    .eq("workshop_id", params.workshopId)
    .or(
      [
        `phone.eq.${normalizedPhone}`,
        `whatsapp_phone.eq.${normalizedPhone}`,
        params.requesterEmail ? `email.eq.${params.requesterEmail}` : "",
      ]
        .filter(Boolean)
        .join(","),
    )
    .maybeSingle();

  if (existingClientError) {
    throw new MarketplaceDataError("No se pudo validar el cliente relacionado.", existingClientError);
  }

  if (existingClient) {
    return existingClient as {
      id: string;
    };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      workshop_id: params.workshopId,
      full_name: params.requesterName,
      phone: normalizedPhone || null,
      whatsapp_phone: normalizedPhone || null,
      email: params.requesterEmail || null,
      notes: "Cliente creado automaticamente desde una solicitud en Fixy.",
    })
    .select("id")
    .single();

  if (error) {
    throw new MarketplaceDataError("No se pudo crear el cliente relacionado.", error);
  }

  return data as { id: string };
}

async function findOrCreateVehicleFromOwnerRequest(params: {
  workshopId: string;
  clientId: string;
  ownerVehicle: OwnerVehicleRow;
}) {
  const supabase = await createSupabaseDataClient();

  if (params.ownerVehicle.plate) {
    const { data: existingVehicle, error: existingVehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("workshop_id", params.workshopId)
      .eq("client_id", params.clientId)
      .eq("plate", params.ownerVehicle.plate)
      .maybeSingle();

    if (existingVehicleError) {
      throw new MarketplaceDataError("No se pudo validar el vehiculo relacionado.", existingVehicleError);
    }

    if (existingVehicle) {
      return existingVehicle as { id: string };
    }
  }

  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      workshop_id: params.workshopId,
      client_id: params.clientId,
      vehicle_label: buildVehicleLabel({
        make: params.ownerVehicle.make,
        model: params.ownerVehicle.model,
        year: params.ownerVehicle.vehicle_year ?? new Date().getFullYear(),
        plate: params.ownerVehicle.plate ?? "POR DEFINIR",
      }),
      plate: params.ownerVehicle.plate ?? "POR DEFINIR",
      make: params.ownerVehicle.make,
      model: params.ownerVehicle.model,
      vehicle_year: params.ownerVehicle.vehicle_year,
      color: params.ownerVehicle.color,
      mileage: params.ownerVehicle.mileage,
      vin: params.ownerVehicle.vin,
      notes:
        params.ownerVehicle.notes ||
        "Vehiculo creado automaticamente desde una solicitud confirmada en Fixy.",
    })
    .select("id")
    .single();

  if (error) {
    throw new MarketplaceDataError("No se pudo crear el vehiculo relacionado.", error);
  }

  return data as { id: string };
}

export async function confirmAndScheduleMarketplaceInquiry(inquiryId: string, workshopId: string) {
  const currentWorkshop = await requireMarketplaceWorkshop("marketplace.manage", workshopId);
  const supabase = await createSupabaseDataClient();
  const { data: inquiryData, error: inquiryError } = await supabase
    .from("marketplace_inquiries")
    .select("*")
    .eq("id", inquiryId)
    .eq("workshop_id", currentWorkshop.id)
    .maybeSingle();

  if (inquiryError) {
    throw new MarketplaceDataError("No se pudo validar la solicitud.", inquiryError);
  }

  const inquiry = (inquiryData as MarketplaceInquiryRow | null) ?? null;

  if (!inquiry) {
    throw new MarketplaceInputError("inquiry_not_available");
  }

  const { data: ownerAppointmentData, error: ownerAppointmentError } = await supabase
    .from("owner_appointment_requests")
    .select("*")
    .eq("workshop_id", currentWorkshop.id)
    .eq("marketplace_inquiry_id", inquiryId)
    .maybeSingle();

  if (ownerAppointmentError) {
    if (isMissingRelationError(ownerAppointmentError)) {
      throw new MarketplaceInputError("inquiry_not_schedulable");
    }

    throw new MarketplaceDataError("No se pudo validar la cita relacionada.", ownerAppointmentError);
  }

  const ownerAppointment = (ownerAppointmentData as OwnerAppointmentRequestRow | null) ?? null;

  if (!ownerAppointment) {
    throw new MarketplaceInputError("inquiry_not_schedulable");
  }

  if (ownerAppointment.status !== "solicitada") {
    throw new MarketplaceInputError("inquiry_not_schedulable");
  }

  const [{ data: ownerProfileData, error: ownerProfileError }, { data: ownerVehicleData, error: ownerVehicleError }, { data: workshopData, error: workshopError }] =
    await Promise.all([
      supabase
        .from("owner_profiles")
        .select("id,full_name,email,phone")
        .eq("id", ownerAppointment.owner_profile_id)
        .maybeSingle(),
      supabase
        .from("owner_vehicles")
        .select("id,owner_profile_id,nickname,plate,make,model,vehicle_year,color,mileage,vin,photo_urls,notes")
        .eq("id", ownerAppointment.owner_vehicle_id)
        .eq("owner_profile_id", ownerAppointment.owner_profile_id)
        .maybeSingle(),
      supabase
        .from("workshops")
        .select("workshop_name,whatsapp_phone")
        .eq("id", currentWorkshop.id)
        .maybeSingle(),
    ]);

  if (ownerProfileError || ownerVehicleError || workshopError) {
    throw new MarketplaceDataError(
      "No se pudieron validar los datos relacionados con la solicitud.",
      ownerProfileError || ownerVehicleError || workshopError,
    );
  }

  const ownerProfile = (ownerProfileData as OwnerProfileRow | null) ?? null;
  const ownerVehicle = (ownerVehicleData as OwnerVehicleRow | null) ?? null;
  const workshop = (workshopData as { workshop_name: string; whatsapp_phone: string | null } | null) ?? null;

  if (!ownerProfile || !ownerVehicle || !workshop) {
    throw new MarketplaceInputError("inquiry_not_schedulable");
  }

  const client = await findOrCreateClientFromOwnerRequest({
    workshopId: currentWorkshop.id,
    requesterName: ownerProfile.full_name,
    requesterPhone: ownerProfile.phone,
    requesterEmail: ownerProfile.email,
  });

  const vehicle = await findOrCreateVehicleFromOwnerRequest({
    workshopId: currentWorkshop.id,
    clientId: client.id,
    ownerVehicle,
  });

  const confirmationNote = `Cita confirmada para ${formatAppointmentDate(ownerAppointment.requested_date)} a las ${formatAppointmentTime(ownerAppointment.requested_time)}.`;

  let appointment: { id: string };

  try {
    appointment = await upsertAppointment({
      clientId: client.id,
      vehicleId: vehicle.id,
      assignedMechanicId: "",
      date: ownerAppointment.requested_date,
      time: formatAppointmentTime(ownerAppointment.requested_time),
      type: "ingreso_servicio",
      status: "confirmada",
      notes: `${inquiry.message}\n\n${confirmationNote}`,
    });
  } catch (error) {
    throw new MarketplaceDataError("No se pudo crear la cita relacionada.", error);
  }

  const [inquiryUpdateResult, ownerAppointmentUpdateResult] = await Promise.all([
    supabase
      .from("marketplace_inquiries")
      .update({ status: "contacted" })
      .eq("id", inquiryId)
      .eq("workshop_id", currentWorkshop.id),
    supabase
      .from("owner_appointment_requests")
      .update({
        status: "confirmada",
        workshop_response_note: confirmationNote,
      })
      .eq("id", ownerAppointment.id)
      .eq("workshop_id", currentWorkshop.id),
  ]);

  const confirmationError = inquiryUpdateResult.error || ownerAppointmentUpdateResult.error;

  if (confirmationError) {
    throw new MarketplaceDataError("No se pudo confirmar la solicitud.", confirmationError);
  }

  if (ownerProfile.email) {
    try {
      await sendOwnerAppointmentConfirmedEmail({
        to: ownerProfile.email,
        ownerName: ownerProfile.full_name,
        workshopName: workshop.workshop_name,
        vehicleLabel:
          ownerVehicle.nickname ||
          [ownerVehicle.make, ownerVehicle.model, ownerVehicle.vehicle_year, ownerVehicle.plate]
            .filter(Boolean)
            .join(" "),
        appointmentDate: formatAppointmentDate(ownerAppointment.requested_date),
        appointmentTime: formatAppointmentTime(ownerAppointment.requested_time),
        serviceNeeded: ownerAppointment.service_needed,
        workshopPhone: workshop.whatsapp_phone,
        note: confirmationNote,
      });
    } catch {
      // Email is best-effort. In-app confirmation remains the source of truth.
    }
  }

  return {
    appointmentId: appointment.id,
  };
}

export async function createMarketplaceReview(
  workshopSlug: string,
  input: MarketplaceReviewInput,
) {
  const parsedResult = marketplaceReviewSchema.safeParse(input);

  if (!parsedResult.success) {
    throw new MarketplaceInputError("invalid_review");
  }

  const parsed = parsedResult.data;
  const workshop = await getMarketplaceWorkshopDetailBySlug(workshopSlug);

  if (!workshop) {
    throw new MarketplaceInputError("workshop_not_available");
  }

  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("workshop_reviews")
    .insert({
      workshop_id: workshop.id,
      reviewer_name: parsed.reviewerName,
      title: parsed.title,
      rating: parsed.rating,
      comment: parsed.comment,
      status: "approved",
      published_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      throw new MarketplaceDataError("No se pudo publicar la resena en este momento.", error);
    }

    throw new MarketplaceDataError("No se pudo publicar la resena en este momento.", error);
  }

  return {
    workshop,
    review: data as WorkshopReviewRow,
  };
}

export async function getWorkshopReviewsForAdmin(workshopId: string) {
  const workshop = await requireMarketplaceWorkshop("marketplace.view", workshopId);
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("workshop_reviews")
    .select("id,reviewer_name,title,rating,comment,workshop_response,workshop_response_at,published_at,created_at,status")
    .eq("workshop_id", workshop.id)
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingRelationError(error)) {
      return [] as WorkshopReviewManagementItem[];
    }

    throw new MarketplaceDataError("No se pudieron cargar las resenas del taller.", error);
  }

  return (((data as WorkshopReviewRow[] | null) ?? []).map((review) => ({
    id: review.id,
    reviewerName: review.reviewer_name,
    title: review.title,
    rating: Number(review.rating),
    comment: review.comment,
    workshopResponse: review.workshop_response,
    workshopResponseAt: review.workshop_response_at,
    publishedAt: review.published_at ?? review.created_at,
  })));
}

export async function respondToWorkshopReview(
  reviewId: string,
  workshopId: string,
  input: WorkshopReviewResponseInput,
) {
  const workshop = await requireMarketplaceWorkshop("marketplace.manage", workshopId);
  const parsedResult = workshopReviewResponseSchema.safeParse(input);

  if (!parsedResult.success) {
    throw new MarketplaceInputError("invalid_review_response");
  }

  const parsed = parsedResult.data;
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("workshop_reviews")
    .update({
      workshop_response: parsed.response,
      workshop_response_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
    .eq("workshop_id", workshop.id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      throw new MarketplaceDataError("No se pudo guardar la respuesta a la resena.", error);
    }

    throw new MarketplaceDataError("No se pudo guardar la respuesta a la resena.", error);
  }

  if (!data) {
    throw new MarketplaceInputError("review_not_available");
  }
}
