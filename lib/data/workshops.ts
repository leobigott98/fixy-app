import type { Route } from "next";
import { redirect } from "next/navigation";

import { getAppSession } from "@/lib/auth/session";
import {
  isEmailIdentifier,
  normalizeLoginIdentifier,
  normalizeSessionEmail,
  normalizeSessionPhone,
} from "@/lib/auth/session-utils";
import { createSupabaseDataClient, isMissingRelationError } from "@/lib/data/core";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { WorkshopRole } from "@/lib/permissions";
import {
  buildOpeningHoursLabel,
  slugifyWorkshopPublicSlug,
  type WorkshopProfileInput,
} from "@/lib/workshops/schema";

export type WorkshopRecord = {
  id: string;
  owner_email: string;
  owner_name: string;
  workshop_name: string;
  whatsapp_phone: string;
  city: string;
  workshop_type: string;
  opening_days: string;
  opens_at: string;
  closes_at: string;
  opening_hours_label: string;
  bay_count: number;
  logo_url: string | null;
  gallery_image_urls: string[] | null;
  preferred_currency: "USD" | "VES" | "USD_VES";
  public_description: string | null;
  public_address: string | null;
  public_contact_phone: string | null;
  public_contact_email: string | null;
  public_slug: string | null;
  public_services: string[] | null;
  profile_visibility: "private" | "public";
  verification_status: "not_requested" | "pending" | "verified";
  created_at: string;
  updated_at: string;
};

export type WorkshopMemberRecord = {
  id: string;
  workshop_id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  role: WorkshopRole;
  mechanic_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkshopInviteRecord = {
  id: string;
  workshop_id: string;
  full_name: string;
  role: Exclude<WorkshopRole, "owner">;
  email: string | null;
  phone: string | null;
  mechanic_id: string | null;
  invited_by_name: string;
  message: string | null;
  status: "pending" | "accepted" | "cancelled";
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkshopAccessControlData = {
  members: WorkshopMemberRecord[];
  invites: WorkshopInviteRecord[];
  mechanicOptions: Array<{
    id: string;
    label: string;
  }>;
};

export type CurrentWorkshopAccess = {
  workshop: WorkshopRecord;
  role: WorkshopRole;
  member: WorkshopMemberRecord | null;
};

type DashboardStats = {
  activeWorkOrders: number;
  pendingQuotes: number;
  collectedThisPeriod: number;
  pendingServices: number;
  completedOrders: number;
  averageTicket: number;
  recentOrders: Array<{
    id: string;
    title: string;
    status: string;
    vehicleLabel: string | null;
    promisedDate: string | null;
    totalAmount: number;
  }>;
  analytics: {
    workOrdersByStatus: Array<{
      label: string;
      value: number;
      color: string;
    }>;
    quotesByStatus: Array<{
      label: string;
      value: number;
      color: string;
    }>;
    cashflowTrend: Array<{
      label: string;
      collected: number;
      expenses: number;
    }>;
  };
};

export type MechanicDashboardData = {
  activeOrders: number;
  upcomingAppointments: number;
  pendingCommissionAmount: number;
  paidCommissionAmount: number;
  assignedWorkOrders: Array<{
    id: string;
    title: string;
    status: string;
    vehicleLabel: string | null;
    promisedDate: string | null;
  }>;
  appointments: Array<{
    id: string;
    date: string;
    time: string;
    clientName: string | null;
    vehicleLabel: string | null;
    status: string;
  }>;
};

export type TeamLeadDashboardData = {
  unassignedOrders: number;
  activeMechanics: number;
  todayAppointments: number;
  mechanics: Array<{
    id: string;
    fullName: string;
    activeOrders: number;
    completedOrders: number;
  }>;
};

export type ReceptionDashboardData = {
  newLeads: number;
  pendingQuotes: number;
  readyDeliveries: number;
  todayAppointments: number;
};

export type FinanceDashboardData = {
  collectedThisMonth: number;
  expensesThisMonth: number;
  pendingBalances: number;
  netThisMonth: number;
};

type RecentOrderRow = {
  id: string;
  title: string;
  status: string;
  vehicle_label: string | null;
  promised_date: string | null;
  total_amount: number | string | null;
};

type PaymentRow = {
  amount: number | string | null;
  status?: string | null;
  paid_at?: string | null;
};

type ExpenseRow = {
  amount: number | string | null;
  spent_at: string | null;
};

type WorkOrderAnalyticsRow = {
  id: string;
  status: string;
  created_at: string;
  total_amount: number | string | null;
};

type QuoteAnalyticsRow = {
  id: string;
  status: string;
  created_at: string;
  total_amount: number | string | null;
};

type WorkshopSlugLookupRecord = {
  id: string;
  public_slug: string | null;
};

function getMonthSeries(months: number) {
  const now = new Date();

  return Array.from({ length: months }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - index - 1), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    return {
      key,
      label: date.toLocaleDateString("es-VE", { month: "short" }),
    };
  });
}

function getMonthKey(dateValue: string | null | undefined) {
  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getWorkOrderStatusColor(status: string) {
  switch (status) {
    case "en_reparacion":
      return "#f97316";
    case "diagnostico_pendiente":
      return "#0f766e";
    case "listo_para_entrega":
      return "#15803d";
    case "presupuesto_pendiente":
      return "#334155";
    case "completada":
      return "#1d4ed8";
    case "cancelada":
      return "#b42318";
    default:
      return "#94a3b8";
  }
}

function getQuoteStatusColor(status: string) {
  switch (status) {
    case "draft":
      return "#334155";
    case "sent":
      return "#0f766e";
    case "approved":
      return "#15803d";
    case "rejected":
      return "#b42318";
    case "expired":
      return "#f97316";
    default:
      return "#94a3b8";
  }
}

function formatDashboardStatus(status: string) {
  switch (status) {
    case "presupuesto_pendiente":
      return "Presupuesto pendiente";
    case "diagnostico_pendiente":
      return "Diagnostico pendiente";
    case "en_reparacion":
      return "En reparacion";
    case "listo_para_entrega":
      return "Listo para entrega";
    case "completada":
      return "Completada";
    case "cancelada":
      return "Cancelada";
    default:
      return status;
  }
}

async function ensureUniquePublicSlug(
  requestedSlug: string,
  currentWorkshopId?: string,
) {
  const supabase = await createSupabaseDataClient();
  const baseSlug = slugifyWorkshopPublicSlug(requestedSlug);
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabase
      .from("workshops")
      .select("id, public_slug")
      .eq("public_slug", candidate)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const match = (data as WorkshopSlugLookupRecord | null) ?? null;

    if (!match || match.id === currentWorkshopId) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function normalizeOptionalEmail(email?: string | null) {
  const value = email?.trim();
  return value ? normalizeSessionEmail(value) : null;
}

function normalizeOptionalPhone(phone?: string | null) {
  const digits = phone ? normalizeSessionPhone(phone) : "";
  return digits || null;
}

async function ensureMechanicProfileForInvite(params: {
  workshopId: string;
  fullName: string;
  phone?: string | null;
  role: Exclude<WorkshopRole, "owner">;
  mechanicId?: string | null;
}) {
  if (params.mechanicId) {
    return params.mechanicId;
  }

  if (!["mechanic", "jefe_taller", "recepcion"].includes(params.role)) {
    return null;
  }

  const supabase = await createSupabaseDataClient();
  const mechanicRole =
    params.role === "mechanic"
      ? "mecanico"
      : params.role === "jefe_taller"
        ? "jefe_taller"
        : "recepcion";

  const { data, error } = await supabase
    .from("mechanics")
    .insert({
      workshop_id: params.workshopId,
      full_name: params.fullName,
      phone: normalizeOptionalPhone(params.phone),
      role: mechanicRole,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return (data as { id: string }).id;
}

async function ensureAuthUserForInvite(params: {
  email?: string | null;
  phone?: string | null;
  fullName: string;
  role: WorkshopRole;
}) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || (!params.email && !params.phone)) {
    return;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();
    const { error } = await supabase.auth.admin.createUser({
      email: params.email ?? undefined,
      email_confirm: Boolean(params.email),
      phone: params.phone ?? undefined,
      phone_confirm: Boolean(params.phone),
      password: randomPassword,
      user_metadata: {
        full_name: params.fullName,
        fixy_role: params.role,
      },
    });

    if (error && !/already registered|exists/i.test(error.message)) {
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && /already registered|exists/i.test(error.message)) {
      return;
    }

    throw error;
  }
}

async function findMemberByIdentifier(identifier: string) {
  const supabase = await createSupabaseDataClient();
  const normalizedIdentifier = normalizeLoginIdentifier(identifier);
  const query = supabase
    .from("workshop_members")
    .select("*, workshops(*)")
    .eq("is_active", true);

  const { data, error } = await (isEmailIdentifier(normalizedIdentifier)
    ? query.eq("email", normalizeSessionEmail(normalizedIdentifier)).maybeSingle()
    : query.eq("phone", normalizeSessionPhone(normalizedIdentifier)).maybeSingle());

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }

  return (
    (data as (WorkshopMemberRecord & {
      workshops: WorkshopRecord | WorkshopRecord[] | null;
    }) | null) ?? null
  );
}

export async function acceptWorkshopInviteForIdentifier(identifier: string) {
  const normalizedIdentifier = normalizeLoginIdentifier(identifier);

  if (!normalizedIdentifier) {
    return null;
  }

  const existingMembership = await findMemberByIdentifier(normalizedIdentifier);

  if (existingMembership) {
    return existingMembership;
  }

  const supabase = await createSupabaseDataClient();
  const inviteQuery = supabase
    .from("workshop_member_invites")
    .select("*")
    .eq("status", "pending")
    .order("invited_at", { ascending: false })
    .limit(1);

  const { data, error } = await (isEmailIdentifier(normalizedIdentifier)
    ? inviteQuery.eq("email", normalizeSessionEmail(normalizedIdentifier)).maybeSingle()
    : inviteQuery.eq("phone", normalizeSessionPhone(normalizedIdentifier)).maybeSingle());

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }

  const invite = (data as WorkshopInviteRecord | null) ?? null;

  if (!invite) {
    return null;
  }

  await ensureAuthUserForInvite({
    email: invite.email,
    phone: invite.phone,
    fullName: invite.full_name,
    role: invite.role,
  });

  const mechanicId =
    invite.mechanic_id ??
    (await ensureMechanicProfileForInvite({
      workshopId: invite.workshop_id,
      fullName: invite.full_name,
      phone: invite.phone,
      role: invite.role,
    }));

  const memberPayload = {
    workshop_id: invite.workshop_id,
    full_name: invite.full_name,
    role: invite.role,
    email: normalizeOptionalEmail(invite.email),
    phone: normalizeOptionalPhone(invite.phone),
    mechanic_id: mechanicId,
    is_active: true,
  };

  const { error: memberError } = await supabase.from("workshop_members").insert(memberPayload);

  if (memberError) {
    throw memberError;
  }

  const { error: inviteError } = await supabase
    .from("workshop_member_invites")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      mechanic_id: mechanicId,
    })
    .eq("id", invite.id);

  if (inviteError) {
    throw inviteError;
  }

  return findMemberByIdentifier(normalizedIdentifier);
}

export async function prepareAuthAccessForIdentifier(identifier: string) {
  const normalizedIdentifier = normalizeLoginIdentifier(identifier);

  if (!normalizedIdentifier) {
    return null;
  }

  const membership = await findMemberByIdentifier(normalizedIdentifier);

  if (membership) {
    await ensureAuthUserForInvite({
      email: membership.email,
      phone: membership.phone,
      fullName: membership.full_name,
      role: membership.role,
    });

    return membership;
  }

  return acceptWorkshopInviteForIdentifier(normalizedIdentifier);
}

export async function getCurrentWorkshopAccess(): Promise<CurrentWorkshopAccess | null> {
  const session = await getAppSession();

  if (!session) {
    return null;
  }

  if (session.user.email) {
    const supabase = await createSupabaseDataClient();
    const { data, error } = await supabase
      .from("workshops")
      .select("*")
      .eq("owner_email", session.user.email)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) {
        return null;
      }

      throw error;
    }

    const ownedWorkshop = (data as WorkshopRecord | null) ?? null;

    if (ownedWorkshop) {
      return {
        workshop: ownedWorkshop,
        role: "owner",
        member: null,
      };
    }
  }

  const membership = await findMemberByIdentifier(session.user.loginIdentifier);

  if (!membership) {
    return null;
  }

  const workshop = Array.isArray(membership.workshops)
    ? membership.workshops[0] ?? null
    : membership.workshops;

  if (!workshop) {
    return null;
  }

  return {
    workshop,
    role: membership.role,
    member: {
      id: membership.id,
      workshop_id: membership.workshop_id,
      email: membership.email,
      phone: membership.phone,
      full_name: membership.full_name,
      role: membership.role,
      mechanic_id: membership.mechanic_id,
      is_active: membership.is_active,
      created_at: membership.created_at,
      updated_at: membership.updated_at,
    },
  };
}

export async function getCurrentWorkshop() {
  const access = await getCurrentWorkshopAccess();
  return access?.workshop ?? null;
}

export async function getCurrentWorkshopRole() {
  const access = await getCurrentWorkshopAccess();
  return access?.role ?? null;
}

export async function requireCurrentWorkshop() {
  const workshop = await getCurrentWorkshop();

  if (!workshop) {
    redirect("/app/onboarding" as Route);
  }

  return workshop;
}

export async function upsertCurrentWorkshop(input: WorkshopProfileInput) {
  const session = await getAppSession();

  if (!session?.user.email) {
    throw new Error("Solo el propietario puede completar el onboarding del taller.");
  }

  const supabase = await createSupabaseDataClient();
  const { data: existingWorkshop, error: existingWorkshopError } = await supabase
    .from("workshops")
    .select("id, public_slug")
    .eq("owner_email", session.user.email)
    .maybeSingle();

  if (existingWorkshopError && !isMissingRelationError(existingWorkshopError)) {
    throw existingWorkshopError;
  }

  const currentWorkshop = (existingWorkshop as WorkshopSlugLookupRecord | null) ?? null;
  const publicSlug = await ensureUniquePublicSlug(
    input.publicSlug || currentWorkshop?.public_slug || input.workshopName,
    currentWorkshop?.id,
  );

  const payload = {
    owner_email: session.user.email,
    owner_name: input.ownerName,
    workshop_name: input.workshopName,
    whatsapp_phone: input.whatsappPhone,
    city: input.city,
    workshop_type: input.workshopType,
    opening_days: input.openingDays,
    opens_at: input.opensAt,
    closes_at: input.closesAt,
    opening_hours_label: buildOpeningHoursLabel(input),
    bay_count: input.bayCount,
    logo_url: input.logoUrl ?? null,
    gallery_image_urls: input.galleryImageUrls,
    preferred_currency: input.currencyDisplay,
    public_description: input.publicDescription || null,
    public_address: input.publicAddress || null,
    public_contact_phone: input.publicContactPhone || null,
    public_contact_email: input.publicContactEmail || null,
    public_slug: publicSlug,
    public_services: input.publicServices,
    profile_visibility: input.profileVisibility,
  };

  const { data, error } = await supabase
    .from("workshops")
    .upsert(payload, { onConflict: "owner_email" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as WorkshopRecord;
}

export async function getWorkshopAccessControlData(): Promise<WorkshopAccessControlData> {
  const access = await getCurrentWorkshopAccess();

  if (!access) {
    return {
      members: [],
      invites: [],
      mechanicOptions: [],
    };
  }

  const supabase = await createSupabaseDataClient();
  const [membersResult, invitesResult, mechanicsResult] = await Promise.all([
    supabase
      .from("workshop_members")
      .select("*")
      .eq("workshop_id", access.workshop.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("workshop_member_invites")
      .select("*")
      .eq("workshop_id", access.workshop.id)
      .order("invited_at", { ascending: false }),
    supabase
      .from("mechanics")
      .select("id,full_name,role")
      .eq("workshop_id", access.workshop.id)
      .eq("is_active", true)
      .order("full_name", { ascending: true }),
  ]);

  const nonMissingError = [membersResult.error, invitesResult.error, mechanicsResult.error].find(
    (error) => error && !isMissingRelationError(error),
  );

  if (nonMissingError) {
    throw nonMissingError;
  }

  return {
    members: (membersResult.data as WorkshopMemberRecord[] | null) ?? [],
    invites: (invitesResult.data as WorkshopInviteRecord[] | null) ?? [],
    mechanicOptions:
      ((mechanicsResult.data as Array<{ id: string; full_name: string; role: string }> | null) ?? []).map(
        (mechanic) => ({
          id: mechanic.id,
          label: `${mechanic.full_name} · ${mechanic.role}`,
        }),
      ),
  };
}

export async function inviteWorkshopMember(values: {
  fullName: string;
  role: Exclude<WorkshopRole, "owner">;
  email?: string | null;
  phone?: string | null;
  mechanicId?: string | null;
  message?: string | null;
}) {
  const access = await getCurrentWorkshopAccess();

  if (!access || access.role !== "owner") {
    throw new Error("Solo el propietario puede invitar al equipo.");
  }

  const email = normalizeOptionalEmail(values.email);
  const phone = normalizeOptionalPhone(values.phone);

  if (!email && !phone) {
    throw new Error("Agrega correo o telefono para invitar al integrante.");
  }

  const supabase = await createSupabaseDataClient();
  const existingMemberQuery = supabase
    .from("workshop_members")
    .select("*")
    .eq("workshop_id", access.workshop.id)
    .eq("is_active", true)
    .limit(1);

  const { data: existingMemberData, error: existingMemberError } = await (email
    ? existingMemberQuery.eq("email", email).maybeSingle()
    : existingMemberQuery.eq("phone", phone).maybeSingle());

  if (existingMemberError && !isMissingRelationError(existingMemberError)) {
    throw existingMemberError;
  }

  const mechanicId =
    values.mechanicId ??
    (await ensureMechanicProfileForInvite({
      workshopId: access.workshop.id,
      fullName: values.fullName,
      phone,
      role: values.role,
      mechanicId: values.mechanicId,
    }));

  await ensureAuthUserForInvite({
    email,
    phone,
    fullName: values.fullName,
    role: values.role,
  });

  if (existingMemberData) {
    const { error } = await supabase
      .from("workshop_members")
      .update({
        full_name: values.fullName,
        role: values.role,
        email,
        phone,
        mechanic_id: mechanicId,
      })
      .eq("id", (existingMemberData as WorkshopMemberRecord).id);

    if (error) {
      throw error;
    }

    return { kind: "updated" as const };
  }

  const { error } = await supabase.from("workshop_member_invites").insert({
    workshop_id: access.workshop.id,
    full_name: values.fullName,
    role: values.role,
    email,
    phone,
    mechanic_id: mechanicId,
    invited_by_name: access.member?.full_name ?? access.workshop.owner_name,
    message: values.message?.trim() || null,
  });

  if (error) {
    throw error;
  }

  return { kind: "invited" as const };
}

export async function getPublicWorkshopBySlug(slug: string) {
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("workshops")
    .select("*")
    .eq("public_slug", slugifyWorkshopPublicSlug(slug))
    .eq("profile_visibility", "public")
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }

  return (data as WorkshopRecord | null) ?? null;
}

export async function getDashboardStats(workshopId: string): Promise<DashboardStats> {
  const supabase = await createSupabaseDataClient();
  const monthSeries = getMonthSeries(6);

  const [
    workOrdersResult,
    quotesResult,
    recentOrdersResult,
    paymentsResult,
    expensesResult,
  ] = await Promise.all([
    supabase
      .from("work_orders")
      .select("id,status,created_at,total_amount")
      .eq("workshop_id", workshopId),
    supabase
      .from("quotes")
      .select("id,status,created_at,total_amount")
      .eq("workshop_id", workshopId),
    supabase
      .from("work_orders")
      .select("id,title,status,vehicle_label,promised_date,total_amount")
      .eq("workshop_id", workshopId)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("payments")
      .select("amount,status,paid_at")
      .eq("workshop_id", workshopId),
    supabase
      .from("expenses")
      .select("amount,spent_at")
      .eq("workshop_id", workshopId),
  ]);

  const results = [
    workOrdersResult.error,
    quotesResult.error,
    recentOrdersResult.error,
    paymentsResult.error,
    expensesResult.error,
  ];

  const nonMissingError = results.find((error) => error && !isMissingRelationError(error));

  if (nonMissingError) {
    throw nonMissingError;
  }

  const workOrders = (workOrdersResult.data as WorkOrderAnalyticsRow[] | null) ?? [];
  const quotes = (quotesResult.data as QuoteAnalyticsRow[] | null) ?? [];
  const payments = (paymentsResult.data as PaymentRow[] | null) ?? [];
  const expenses = (expensesResult.data as ExpenseRow[] | null) ?? [];

  const activeWorkOrders = workOrders.filter((workOrder) =>
    ["presupuesto_pendiente", "diagnostico_pendiente", "en_reparacion", "listo_para_entrega"].includes(
      workOrder.status,
    ),
  ).length;

  const pendingQuotes = quotes.filter((quote) => ["draft", "sent"].includes(quote.status)).length;
  const pendingServices = workOrders.filter((workOrder) =>
    ["presupuesto_pendiente", "diagnostico_pendiente", "en_reparacion"].includes(workOrder.status),
  ).length;

  const collectedPayments = payments.filter((payment) =>
    ["paid", "partial"].includes(payment.status ?? ""),
  );

  const currentMonthKey = getMonthKey(new Date().toISOString());
  const collectedThisPeriod = collectedPayments
    .filter((payment) => getMonthKey(payment.paid_at) === currentMonthKey)
    .reduce((total, payment) => total + Number(payment.amount ?? 0), 0);

  const completedOrders = workOrders.filter((workOrder) => workOrder.status === "completada").length;
  const averageTicket = completedOrders
    ? workOrders
        .filter((workOrder) => workOrder.status === "completada")
        .reduce((total, workOrder) => total + Number(workOrder.total_amount ?? 0), 0) / completedOrders
    : 0;

  const workOrdersByStatus = [
    "presupuesto_pendiente",
    "diagnostico_pendiente",
    "en_reparacion",
    "listo_para_entrega",
    "completada",
    "cancelada",
  ].map((status) => ({
    label: formatDashboardStatus(status),
    value: workOrders.filter((workOrder) => workOrder.status === status).length,
    color: getWorkOrderStatusColor(status),
  }));

  const quotesByStatus = ["draft", "sent", "approved", "rejected", "expired"].map((status) => ({
    label:
      status === "draft"
        ? "Borrador"
        : status === "sent"
          ? "Enviado"
          : status === "approved"
            ? "Aprobado"
            : status === "rejected"
              ? "Rechazado"
              : "Vencido",
    value: quotes.filter((quote) => quote.status === status).length,
    color: getQuoteStatusColor(status),
  }));

  const cashflowTrend = monthSeries.map((month) => ({
    label: month.label,
    collected: Number(
      collectedPayments
        .filter((payment) => getMonthKey(payment.paid_at) === month.key)
        .reduce((total, payment) => total + Number(payment.amount ?? 0), 0)
        .toFixed(2),
    ),
    expenses: Number(
      expenses
        .filter((expense) => getMonthKey(expense.spent_at) === month.key)
        .reduce((total, expense) => total + Number(expense.amount ?? 0), 0)
        .toFixed(2),
    ),
  }));

  return {
    activeWorkOrders,
    pendingQuotes,
    pendingServices,
    collectedThisPeriod,
    completedOrders,
    averageTicket: Number(averageTicket.toFixed(2)),
    recentOrders:
      ((recentOrdersResult.data as RecentOrderRow[] | null)?.map((order) => ({
        id: order.id,
        title: order.title,
        status: formatDashboardStatus(order.status),
        vehicleLabel: order.vehicle_label,
        promisedDate: order.promised_date,
        totalAmount: Number(order.total_amount ?? 0),
      })) ?? []),
    analytics: {
      workOrdersByStatus,
      quotesByStatus,
      cashflowTrend,
    },
  };
}

export async function getMechanicDashboardData(workshopId: string, mechanicId: string): Promise<MechanicDashboardData> {
  const supabase = await createSupabaseDataClient();
  const today = new Date().toISOString().slice(0, 10);

  const [workOrdersResult, appointmentsResult, commissionsResult] = await Promise.all([
    supabase
      .from("work_orders")
      .select("id,title,status,vehicle_label,promised_date")
      .eq("workshop_id", workshopId)
      .eq("assigned_mechanic_id", mechanicId)
      .order("promised_date", { ascending: true, nullsFirst: false })
      .order("updated_at", { ascending: false }),
    supabase
      .from("appointments")
      .select("id,appointment_date,appointment_time,status,clients(full_name),vehicles(vehicle_label,plate)")
      .eq("workshop_id", workshopId)
      .eq("assigned_mechanic_id", mechanicId)
      .gte("appointment_date", today)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true })
      .limit(6),
    supabase
      .from("commissions")
      .select("amount,status")
      .eq("workshop_id", workshopId)
      .eq("mechanic_id", mechanicId),
  ]);

  const nonMissingError = [workOrdersResult.error, appointmentsResult.error, commissionsResult.error].find(
    (error) => error && !isMissingRelationError(error),
  );

  if (nonMissingError) {
    throw nonMissingError;
  }

  const workOrders =
    ((workOrdersResult.data as Array<{
      id: string;
      title: string;
      status: string;
      vehicle_label: string | null;
      promised_date: string | null;
    }> | null) ?? []);
  const appointments =
    ((appointmentsResult.data as Array<{
      id: string;
      appointment_date: string;
      appointment_time: string;
      status: string;
      clients: { full_name: string } | { full_name: string }[] | null;
      vehicles:
        | { vehicle_label: string | null; plate: string | null }
        | { vehicle_label: string | null; plate: string | null }[]
        | null;
    }> | null) ?? []);
  const commissions =
    ((commissionsResult.data as Array<{ amount: number | string | null; status: string }> | null) ?? []);

  const activeOrders = workOrders.filter((order) => !["completada", "cancelada"].includes(order.status)).length;

  return {
    activeOrders,
    upcomingAppointments: appointments.length,
    pendingCommissionAmount: commissions
      .filter((item) => item.status !== "paid")
      .reduce((total, item) => total + Number(item.amount ?? 0), 0),
    paidCommissionAmount: commissions
      .filter((item) => item.status === "paid")
      .reduce((total, item) => total + Number(item.amount ?? 0), 0),
    assignedWorkOrders: workOrders.slice(0, 6).map((order) => ({
      id: order.id,
      title: order.title,
      status: formatDashboardStatus(order.status),
      vehicleLabel: order.vehicle_label,
      promisedDate: order.promised_date,
    })),
    appointments: appointments.map((appointment) => {
      const client = Array.isArray(appointment.clients)
        ? appointment.clients[0] ?? null
        : appointment.clients;
      const vehicle = Array.isArray(appointment.vehicles)
        ? appointment.vehicles[0] ?? null
        : appointment.vehicles;

      return {
        id: appointment.id,
        date: appointment.appointment_date,
        time: appointment.appointment_time.slice(0, 5),
        clientName: client?.full_name ?? null,
        vehicleLabel: vehicle?.vehicle_label ?? vehicle?.plate ?? null,
        status: appointment.status,
      };
    }),
  };
}

export async function getTeamLeadDashboardData(workshopId: string): Promise<TeamLeadDashboardData> {
  const supabase = await createSupabaseDataClient();
  const today = new Date().toISOString().slice(0, 10);

  const [mechanicsResult, workOrdersResult, appointmentsResult] = await Promise.all([
    supabase
      .from("mechanics")
      .select("id,full_name,is_active")
      .eq("workshop_id", workshopId)
      .eq("is_active", true)
      .order("full_name", { ascending: true }),
    supabase
      .from("work_orders")
      .select("id,status,assigned_mechanic_id")
      .eq("workshop_id", workshopId),
    supabase
      .from("appointments")
      .select("id")
      .eq("workshop_id", workshopId)
      .eq("appointment_date", today),
  ]);

  const nonMissingError = [mechanicsResult.error, workOrdersResult.error, appointmentsResult.error].find(
    (error) => error && !isMissingRelationError(error),
  );

  if (nonMissingError) {
    throw nonMissingError;
  }

  const mechanics =
    ((mechanicsResult.data as Array<{ id: string; full_name: string; is_active: boolean }> | null) ?? []);
  const workOrders =
    ((workOrdersResult.data as Array<{
      id: string;
      status: string;
      assigned_mechanic_id: string | null;
    }> | null) ?? []);

  return {
    unassignedOrders: workOrders.filter(
      (order) => !order.assigned_mechanic_id && !["completada", "cancelada"].includes(order.status),
    ).length,
    activeMechanics: mechanics.length,
    todayAppointments: ((appointmentsResult.data as Array<{ id: string }> | null) ?? []).length,
    mechanics: mechanics.map((mechanic) => ({
      id: mechanic.id,
      fullName: mechanic.full_name,
      activeOrders: workOrders.filter(
        (order) =>
          order.assigned_mechanic_id === mechanic.id &&
          !["completada", "cancelada"].includes(order.status),
      ).length,
      completedOrders: workOrders.filter(
        (order) => order.assigned_mechanic_id === mechanic.id && order.status === "completada",
      ).length,
    })),
  };
}

export async function getReceptionDashboardData(workshopId: string): Promise<ReceptionDashboardData> {
  const supabase = await createSupabaseDataClient();
  const today = new Date().toISOString().slice(0, 10);

  const [quotesResult, workOrdersResult, appointmentsResult, inquiriesResult] = await Promise.all([
    supabase.from("quotes").select("id,status").eq("workshop_id", workshopId),
    supabase.from("work_orders").select("id,status").eq("workshop_id", workshopId),
    supabase
      .from("appointments")
      .select("id")
      .eq("workshop_id", workshopId)
      .eq("appointment_date", today),
    supabase
      .from("marketplace_inquiries")
      .select("id,status")
      .eq("workshop_id", workshopId),
  ]);

  const nonMissingError = [quotesResult.error, workOrdersResult.error, appointmentsResult.error, inquiriesResult.error].find(
    (error) => error && !isMissingRelationError(error),
  );

  if (nonMissingError) {
    throw nonMissingError;
  }

  const quotes = (quotesResult.data as Array<{ id: string; status: string }> | null) ?? [];
  const workOrders = (workOrdersResult.data as Array<{ id: string; status: string }> | null) ?? [];
  const inquiries = (inquiriesResult.data as Array<{ id: string; status: string }> | null) ?? [];

  return {
    newLeads: inquiries.filter((item) => item.status === "new").length,
    pendingQuotes: quotes.filter((item) => ["draft", "sent"].includes(item.status)).length,
    readyDeliveries: workOrders.filter((item) => item.status === "listo_para_entrega").length,
    todayAppointments: ((appointmentsResult.data as Array<{ id: string }> | null) ?? []).length,
  };
}

export async function getFinanceDashboardData(workshopId: string): Promise<FinanceDashboardData> {
  const supabase = await createSupabaseDataClient();
  const currentMonthKey = getMonthKey(new Date().toISOString());

  const [paymentsResult, expensesResult, workOrdersResult] = await Promise.all([
    supabase.from("payments").select("amount,status,paid_at").eq("workshop_id", workshopId),
    supabase.from("expenses").select("amount,spent_at").eq("workshop_id", workshopId),
    supabase.from("work_orders").select("total_amount,status").eq("workshop_id", workshopId),
  ]);

  const nonMissingError = [paymentsResult.error, expensesResult.error, workOrdersResult.error].find(
    (error) => error && !isMissingRelationError(error),
  );

  if (nonMissingError) {
    throw nonMissingError;
  }

  const payments = (paymentsResult.data as PaymentRow[] | null) ?? [];
  const expenses = (expensesResult.data as ExpenseRow[] | null) ?? [];
  const workOrders =
    ((workOrdersResult.data as Array<{ total_amount: number | string | null; status: string }> | null) ?? []);

  const collectedThisMonth = payments
    .filter((payment) => ["paid", "partial"].includes(payment.status ?? ""))
    .filter((payment) => getMonthKey(payment.paid_at) === currentMonthKey)
    .reduce((total, payment) => total + Number(payment.amount ?? 0), 0);

  const expensesThisMonth = expenses
    .filter((expense) => getMonthKey(expense.spent_at) === currentMonthKey)
    .reduce((total, expense) => total + Number(expense.amount ?? 0), 0);

  const pendingBalances = workOrders
    .filter((order) => !["completada", "cancelada"].includes(order.status))
    .reduce((total, order) => total + Number(order.total_amount ?? 0), 0);

  return {
    collectedThisMonth,
    expensesThisMonth,
    pendingBalances,
    netThisMonth: Number((collectedThisMonth - expensesThisMonth).toFixed(2)),
  };
}
