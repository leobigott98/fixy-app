import type { Route } from "next";
import { redirect } from "next/navigation";

import type { OwnerAppointmentFormValues, OwnerProfileFormValues } from "@/lib/car-owners/schema";
import { createSupabaseDataClient, isMissingRelationError } from "@/lib/data/core";
import { getMarketplaceDirectory, getMarketplaceWorkshopDetailBySlug } from "@/lib/data/marketplace";
import { getAppSession } from "@/lib/auth/session";
import { createMarketplaceReview } from "@/lib/data/marketplace";
import { slugifyWorkshopPublicSlug } from "@/lib/workshops/schema";

type OwnerProfileRow = {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string | null;
  phone: string;
  city: string | null;
  avatar_url: string | null;
  preferred_contact: "whatsapp" | "llamada" | "correo";
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

type OwnerAppointmentRow = {
  id: string;
  owner_profile_id: string;
  owner_vehicle_id: string | null;
  workshop_id: string;
  requested_date: string;
  requested_time: string;
  service_needed: string;
  issue_summary: string;
  contact_channel: "whatsapp" | "llamada" | "correo";
  status: "solicitada" | "confirmada" | "completada" | "cancelada";
  workshop_response_note: string | null;
};

type OwnerServiceRecordRow = {
  id: string;
  owner_profile_id: string;
  owner_vehicle_id: string;
  workshop_id: string | null;
  workshop_name: string;
  mechanic_name: string | null;
  service_date: string;
  delivered_at: string | null;
  service_type: string;
  description: string;
  parts_used: string[] | null;
  total_cost: number | string | null;
  currency: "USD" | "VES" | "USD_VES";
  duration_hours: number | string | null;
  photo_urls: string[] | null;
  notes: string | null;
};

type WorkshopLite = {
  id: string;
  workshop_name: string;
  city: string;
  public_slug: string | null;
};

export type OwnerProfileRecord = {
  id: string;
  authUserId: string;
  fullName: string;
  email: string | null;
  phone: string;
  city: string | null;
  avatarUrl: string | null;
  preferredContact: "whatsapp" | "llamada" | "correo";
};

export type OwnerVehicleRecord = {
  id: string;
  nickname: string | null;
  plate: string | null;
  make: string;
  model: string;
  vehicleYear: number | null;
  color: string | null;
  mileage: number | null;
  vin: string | null;
  photoUrls: string[];
  notes: string | null;
  label: string;
};

export type OwnerAppointmentListItem = {
  id: string;
  requestedDate: string;
  requestedTime: string;
  serviceNeeded: string;
  issueSummary: string;
  contactChannel: "whatsapp" | "llamada" | "correo";
  status: "solicitada" | "confirmada" | "completada" | "cancelada";
  workshopResponseNote: string | null;
  vehicle: OwnerVehicleRecord | null;
  workshop: {
    id: string;
    name: string;
    city: string;
    slug: string | null;
  };
};

export type OwnerServiceRecordListItem = {
  id: string;
  serviceDate: string;
  deliveredAt: string | null;
  workshopId: string | null;
  workshopName: string;
  workshopSlug: string | null;
  mechanicName: string | null;
  serviceType: string;
  description: string;
  partsUsed: string[];
  totalCost: number;
  currency: "USD" | "VES" | "USD_VES";
  durationHours: number | null;
  photoUrls: string[];
  notes: string | null;
  vehicle: OwnerVehicleRecord | null;
};

export type OwnerDashboardData = {
  profile: OwnerProfileRecord;
  vehicles: OwnerVehicleRecord[];
  upcomingAppointments: OwnerAppointmentListItem[];
  recentServices: OwnerServiceRecordListItem[];
  spotlightWorkshops: Awaited<ReturnType<typeof getMarketplaceDirectory>>["workshops"];
  stats: {
    vehicles: number;
    appointments: number;
    services: number;
    workshops: number;
  };
};

function mapOwnerProfile(row: OwnerProfileRow): OwnerProfileRecord {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    avatarUrl: row.avatar_url,
    preferredContact: row.preferred_contact,
  };
}

function mapOwnerVehicle(row: OwnerVehicleRow): OwnerVehicleRecord {
  return {
    id: row.id,
    nickname: row.nickname,
    plate: row.plate,
    make: row.make,
    model: row.model,
    vehicleYear: row.vehicle_year,
    color: row.color,
    mileage: row.mileage,
    vin: row.vin,
    photoUrls: row.photo_urls ?? [],
    notes: row.notes,
    label: row.nickname || [row.make, row.model, row.vehicle_year, row.plate].filter(Boolean).join(" "),
  };
}

async function getOwnerSession() {
  return getAppSession();
}

async function getOwnerVehicleMap(ownerProfileId: string) {
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("owner_vehicles")
    .select("*")
    .eq("owner_profile_id", ownerProfileId)
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) {
      return new Map<string, OwnerVehicleRecord>();
    }

    throw error;
  }

  return new Map(
    (((data as OwnerVehicleRow[] | null) ?? []).map((item) => {
      const vehicle = mapOwnerVehicle(item);
      return [vehicle.id, vehicle] as const;
    })),
  );
}

export async function getCurrentCarOwnerProfile() {
  const session = await getOwnerSession();

  if (!session) {
    return null;
  }

  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("owner_profiles")
    .select("*")
    .eq("auth_user_id", session.user.id)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }

  const profile = (data as OwnerProfileRow | null) ?? null;
  return profile ? mapOwnerProfile(profile) : null;
}

export async function requireCurrentCarOwnerProfile() {
  const profile = await getCurrentCarOwnerProfile();

  if (!profile) {
    redirect("/app/owner/onboarding" as Route);
  }

  return profile;
}

export async function upsertCurrentCarOwnerProfile(values: OwnerProfileFormValues) {
  const session = await getOwnerSession();

  if (!session) {
    throw new Error("Necesitas iniciar sesion.");
  }

  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("owner_profiles")
    .upsert(
      {
        auth_user_id: session.user.id,
        full_name: values.fullName,
        email: session.user.email,
        phone: values.phone,
        city: values.city || null,
        avatar_url: values.avatarUrl || null,
        preferred_contact: values.preferredContact,
      },
      { onConflict: "auth_user_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapOwnerProfile(data as OwnerProfileRow);
}

export async function getCarOwnerVehicles() {
  const profile = await requireCurrentCarOwnerProfile();
  const vehicleMap = await getOwnerVehicleMap(profile.id);
  return Array.from(vehicleMap.values());
}

export async function getCarOwnerVehicleById(vehicleId: string) {
  const profile = await requireCurrentCarOwnerProfile();
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("owner_vehicles")
    .select("*")
    .eq("owner_profile_id", profile.id)
    .eq("id", vehicleId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapOwnerVehicle(data as OwnerVehicleRow) : null;
}

export async function upsertCarOwnerVehicle(
  values: {
    nickname: string | null;
    plate: string | null;
    make: string;
    model: string;
    vehicleYear: number | null;
    color: string | null;
    mileage: number | null;
    vin: string | null;
    notes: string | null;
    photoUrls: string[];
  },
  vehicleId?: string,
) {
  const profile = await requireCurrentCarOwnerProfile();
  const supabase = await createSupabaseDataClient();
  const payload = {
    owner_profile_id: profile.id,
    nickname: values.nickname,
    plate: values.plate,
    make: values.make,
    model: values.model,
    vehicle_year: values.vehicleYear,
    color: values.color,
    mileage: values.mileage,
    vin: values.vin,
    notes: values.notes,
    photo_urls: values.photoUrls,
  };

  const query = vehicleId
    ? supabase
        .from("owner_vehicles")
        .update(payload)
        .eq("owner_profile_id", profile.id)
        .eq("id", vehicleId)
    : supabase.from("owner_vehicles").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    throw error;
  }

  return mapOwnerVehicle(data as OwnerVehicleRow);
}

export async function getCarOwnerAppointments() {
  const profile = await requireCurrentCarOwnerProfile();
  const vehicleMap = await getOwnerVehicleMap(profile.id);
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("owner_appointment_requests")
    .select("*, workshops(id,workshop_name,city,public_slug)")
    .eq("owner_profile_id", profile.id)
    .order("requested_date", { ascending: true })
    .order("requested_time", { ascending: true });

  if (error) {
    if (isMissingRelationError(error)) {
      return [] as OwnerAppointmentListItem[];
    }

    throw error;
  }

  return (((data as Array<
    OwnerAppointmentRow & { workshops: WorkshopLite | WorkshopLite[] | null }
  > | null) ?? []).map((item) => {
    const workshop = Array.isArray(item.workshops) ? item.workshops[0] ?? null : item.workshops;

    return {
      id: item.id,
      requestedDate: item.requested_date,
      requestedTime: item.requested_time.slice(0, 5),
      serviceNeeded: item.service_needed,
      issueSummary: item.issue_summary,
      contactChannel: item.contact_channel,
      status: item.status,
      workshopResponseNote: item.workshop_response_note,
      vehicle: item.owner_vehicle_id ? (vehicleMap.get(item.owner_vehicle_id) ?? null) : null,
      workshop: {
        id: workshop?.id ?? item.workshop_id,
        name: workshop?.workshop_name ?? "Taller",
        city: workshop?.city ?? "",
        slug: workshop?.public_slug ?? null,
      },
    };
  }));
}

export async function createCarOwnerAppointmentRequest(values: OwnerAppointmentFormValues) {
  const profile = await requireCurrentCarOwnerProfile();
  const vehicle = await getCarOwnerVehicleById(values.ownerVehicleId);

  if (!vehicle) {
    throw new Error("Selecciona un carro valido.");
  }

  const workshop = await getMarketplaceWorkshopDetailBySlug(values.workshopSlug);

  if (!workshop) {
    throw new Error("Ese taller ya no esta disponible.");
  }

  const supabase = await createSupabaseDataClient();
  const { data: inquiryData, error: inquiryError } = await supabase
    .from("marketplace_inquiries")
    .insert({
      workshop_id: workshop.id,
      requester_name: profile.fullName,
      requester_phone: profile.phone,
      requester_city: profile.city,
      requested_service: values.serviceNeeded,
      vehicle_reference: vehicle.label,
      preferred_contact: values.contactChannel === "correo" ? "whatsapp" : values.contactChannel,
      message: `${values.issueSummary}\nFecha solicitada: ${values.requestedDate} ${values.requestedTime}`,
      source: "car_owner_app",
    })
    .select("id")
    .single();

  if (inquiryError && !isMissingRelationError(inquiryError)) {
    throw inquiryError;
  }

  const { data, error } = await supabase
    .from("owner_appointment_requests")
    .insert({
      owner_profile_id: profile.id,
      owner_vehicle_id: values.ownerVehicleId,
      workshop_id: workshop.id,
      marketplace_inquiry_id: (inquiryData as { id: string } | null)?.id ?? null,
      requested_date: values.requestedDate,
      requested_time: values.requestedTime,
      service_needed: values.serviceNeeded,
      issue_summary: values.issueSummary,
      contact_channel: values.contactChannel,
      status: "solicitada",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as OwnerAppointmentRow;
}

export async function getCarOwnerServiceRecords() {
  const profile = await requireCurrentCarOwnerProfile();
  const vehicleMap = await getOwnerVehicleMap(profile.id);
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("owner_service_records")
    .select("*, workshops(id,workshop_name,city,public_slug)")
    .eq("owner_profile_id", profile.id)
    .order("service_date", { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) {
      return [] as OwnerServiceRecordListItem[];
    }

    throw error;
  }

  return (((data as Array<
    OwnerServiceRecordRow & { workshops: WorkshopLite | WorkshopLite[] | null }
  > | null) ?? []).map((item) => {
    const workshop = Array.isArray(item.workshops) ? item.workshops[0] ?? null : item.workshops;

    return {
      id: item.id,
      serviceDate: item.service_date,
      deliveredAt: item.delivered_at,
      workshopId: item.workshop_id,
      workshopName: item.workshop_name,
      workshopSlug: workshop?.public_slug ?? null,
      mechanicName: item.mechanic_name,
      serviceType: item.service_type,
      description: item.description,
      partsUsed: item.parts_used ?? [],
      totalCost: Number(item.total_cost ?? 0),
      currency: item.currency,
      durationHours: item.duration_hours ? Number(item.duration_hours) : null,
      photoUrls: item.photo_urls ?? [],
      notes: item.notes,
      vehicle: vehicleMap.get(item.owner_vehicle_id) ?? null,
    };
  }));
}

export async function createCarOwnerServiceRecord(values: {
  ownerVehicleId: string;
  workshopSlug: string | null;
  workshopName: string;
  mechanicName: string | null;
  serviceDate: string;
  deliveredAt: string | null;
  serviceType: string;
  description: string;
  partsUsed: string[];
  totalCost: number;
  currency: "USD" | "VES" | "USD_VES";
  durationHours: number | null;
  notes: string | null;
  photoUrls: string[];
}) {
  const profile = await requireCurrentCarOwnerProfile();
  const vehicle = await getCarOwnerVehicleById(values.ownerVehicleId);

  if (!vehicle) {
    throw new Error("Selecciona un carro valido.");
  }

  const workshop = values.workshopSlug
    ? await getMarketplaceWorkshopDetailBySlug(slugifyWorkshopPublicSlug(values.workshopSlug))
    : null;
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("owner_service_records")
    .insert({
      owner_profile_id: profile.id,
      owner_vehicle_id: values.ownerVehicleId,
      workshop_id: workshop?.id ?? null,
      workshop_name: workshop?.workshop_name ?? values.workshopName,
      mechanic_name: values.mechanicName,
      service_date: values.serviceDate,
      delivered_at: values.deliveredAt,
      service_type: values.serviceType,
      description: values.description,
      parts_used: values.partsUsed,
      total_cost: values.totalCost,
      currency: values.currency,
      duration_hours: values.durationHours,
      notes: values.notes,
      photo_urls: values.photoUrls,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as OwnerServiceRecordRow;
}

export async function createOwnerWorkshopReview(values: {
  workshopId: string;
  ownerVehicleId: string;
  title: string;
  rating: number;
  comment: string;
}) {
  const profile = await requireCurrentCarOwnerProfile();
  const vehicle = await getCarOwnerVehicleById(values.ownerVehicleId);

  if (!vehicle) {
    throw new Error("Selecciona un carro valido.");
  }

  const supabase = await createSupabaseDataClient();
  const { data: workshopData, error: workshopError } = await supabase
    .from("workshops")
    .select("public_slug")
    .eq("id", values.workshopId)
    .maybeSingle();

  if (workshopError) {
    throw workshopError;
  }

  const workshopSlug = (workshopData as { public_slug: string | null } | null)?.public_slug;

  if (!workshopSlug) {
    throw new Error("El taller no tiene perfil publico para reseñas.");
  }

  const result = await createMarketplaceReview(workshopSlug, {
    reviewerName: profile.fullName,
    title: values.title,
    rating: values.rating,
    comment: values.comment,
  });

  await supabase
    .from("workshop_reviews")
    .update({
      owner_profile_id: profile.id,
      owner_vehicle_id: vehicle.id,
    })
    .eq("id", result.review.id);
}

export async function getCarOwnerDashboardData(): Promise<OwnerDashboardData> {
  const profile = await requireCurrentCarOwnerProfile();
  const [vehicles, appointments, recentServices, spotlightDirectory] = await Promise.all([
    getCarOwnerVehicles(),
    getCarOwnerAppointments(),
    getCarOwnerServiceRecords(),
    getMarketplaceDirectory({}),
  ]);

  return {
    profile,
    vehicles,
    upcomingAppointments: appointments.filter((item) => ["solicitada", "confirmada"].includes(item.status)),
    recentServices: recentServices.slice(0, 4),
    spotlightWorkshops: spotlightDirectory.workshops.slice(0, 3),
    stats: {
      vehicles: vehicles.length,
      appointments: appointments.filter((item) => item.status !== "cancelada").length,
      services: recentServices.length,
      workshops: spotlightDirectory.total,
    },
  };
}

export async function getCarOwnerAppointmentFormOptions(preselectedWorkshopSlug?: string) {
  const [vehicles, directory] = await Promise.all([getCarOwnerVehicles(), getMarketplaceDirectory({})]);

  return {
    vehicles,
    workshops: directory.workshops.map((workshop) => ({
      id: workshop.id,
      slug: workshop.public_slug ?? "",
      name: workshop.workshop_name,
      city: workshop.city,
    })),
    preselectedWorkshopSlug:
      preselectedWorkshopSlug && directory.workshops.some((item) => item.public_slug === preselectedWorkshopSlug)
        ? preselectedWorkshopSlug
        : "",
  };
}
