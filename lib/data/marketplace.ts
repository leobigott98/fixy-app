import { createSupabaseDataClient, isMissingRelationError } from "@/lib/data/core";
import {
  marketplaceInquirySchema,
  marketplaceReviewSchema,
  workshopReviewResponseSchema,
  type MarketplaceInquiryInput,
  type MarketplaceReviewInput,
  type WorkshopReviewResponseInput,
} from "@/lib/marketplace/schema";
import type { WorkshopRecord } from "@/lib/data/workshops";
import { sendWorkshopInquiryEmail } from "@/lib/notifications/email";
import { slugifyWorkshopPublicSlug } from "@/lib/workshops/schema";

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
  message: string;
  status: "new" | "contacted" | "closed";
  createdAt: string;
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

function emptyReviewSummary(): MarketplaceReviewSummary {
  return {
    totalApproved: 0,
    averageRating: null,
  };
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

    throw error;
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

    throw error;
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

    throw error;
  }

  if (locationsError) {
    if (!isMissingRelationError(locationsError)) {
      throw locationsError;
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

    throw error;
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
  const parsed = marketplaceInquirySchema.parse(input);
  const workshop = await getMarketplaceWorkshopDetailBySlug(workshopSlug);

  if (!workshop) {
    throw new Error("El taller ya no esta disponible para solicitudes publicas.");
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
      throw new Error("La base de solicitudes aun no esta disponible.");
    }

    throw error;
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
  const supabase = await createSupabaseDataClient();
  const { count, error } = await supabase
    .from("marketplace_inquiries")
    .select("*", { count: "exact", head: true })
    .eq("workshop_id", workshopId)
    .eq("status", "new");

  if (error) {
    if (isMissingRelationError(error)) {
      return 0;
    }

    throw error;
  }

  return count ?? 0;
}

export async function getWorkshopNotifications(workshopId: string) {
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("marketplace_inquiries")
    .select("*")
    .eq("workshop_id", workshopId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    if (isMissingRelationError(error)) {
      return [] as WorkshopNotificationItem[];
    }

    throw error;
  }

  return (((data as MarketplaceInquiryRow[] | null) ?? []).map((item) => ({
    id: item.id,
    workshopId: item.workshop_id,
    requesterName: item.requester_name,
    requesterPhone: item.requester_phone,
    requesterCity: item.requester_city,
    requestedService: item.requested_service,
    vehicleReference: item.vehicle_reference,
    preferredContact: item.preferred_contact,
    message: item.message,
    status: item.status,
    createdAt: item.created_at,
  })));
}

export async function markMarketplaceInquiryAsContacted(inquiryId: string, workshopId: string) {
  const supabase = await createSupabaseDataClient();
  const { error } = await supabase
    .from("marketplace_inquiries")
    .update({ status: "contacted" })
    .eq("id", inquiryId)
    .eq("workshop_id", workshopId);

  if (error) {
    if (isMissingRelationError(error)) {
      throw new Error("La base de solicitudes aun no esta disponible.");
    }

    throw error;
  }
}

export async function createMarketplaceReview(
  workshopSlug: string,
  input: MarketplaceReviewInput,
) {
  const parsed = marketplaceReviewSchema.parse(input);
  const workshop = await getMarketplaceWorkshopDetailBySlug(workshopSlug);

  if (!workshop) {
    throw new Error("El taller ya no esta disponible para recibir resenas.");
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
      throw new Error("La base de resenas aun no esta disponible.");
    }

    throw error;
  }

  return {
    workshop,
    review: data as WorkshopReviewRow,
  };
}

export async function getWorkshopReviewsForAdmin(workshopId: string) {
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("workshop_reviews")
    .select("id,reviewer_name,title,rating,comment,workshop_response,workshop_response_at,published_at,created_at,status")
    .eq("workshop_id", workshopId)
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingRelationError(error)) {
      return [] as WorkshopReviewManagementItem[];
    }

    throw error;
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
  const parsed = workshopReviewResponseSchema.parse(input);
  const supabase = await createSupabaseDataClient();
  const { error } = await supabase
    .from("workshop_reviews")
    .update({
      workshop_response: parsed.response,
      workshop_response_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
    .eq("workshop_id", workshopId);

  if (error) {
    if (isMissingRelationError(error)) {
      throw new Error("La base de resenas aun no esta disponible.");
    }

    throw error;
  }
}
