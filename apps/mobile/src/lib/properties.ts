import { supabase } from "./supabase";
import { toFriendlyDatabaseError } from "./errors";
import type {
  Amenity,
  LocationRow,
  Property,
  PropertyCard,
  PropertyDetailsResponse,
  PropertyImage,
  SearchFilters,
  ViewingRequest,
  ViewingStatus,
} from "@/types/database";

export class PropertyQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PropertyQueryError";
  }
}

/** Core search used by Home sections, Search + Filters, Map, and Favorites. */
export async function searchProperties(filters: SearchFilters): Promise<PropertyCard[]> {
  const { data, error } = await supabase.rpc("search_properties", {
    viewer_id: filters.viewer_id ?? null,
    search_text: filters.search_text ?? null,
    min_rent: filters.min_rent ?? null,
    max_rent: filters.max_rent ?? null,
    bedrooms_filter: filters.bedrooms_filter ?? null,
    property_types: filters.property_types ?? null,
    amenity_ids: filters.amenity_ids ?? null,
    county_filter: filters.county_filter ?? null,
    town_filter: filters.town_filter ?? null,
    property_ids: filters.property_ids ?? null,
    user_lat: filters.user_lat ?? null,
    user_lng: filters.user_lng ?? null,
    radius_meters: filters.radius_meters ?? null,
    sort_by: filters.sort_by ?? "newest",
    page_limit: filters.page_limit ?? 20,
    page_offset: filters.page_offset ?? 0,
  });

  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));
  return (data ?? []) as unknown as PropertyCard[];
}

export async function getPropertyDetails(
  propertyId: string,
  viewerId: string | null,
): Promise<PropertyDetailsResponse> {
  const { data, error } = await supabase.rpc("property_details", {
    target_property_id: propertyId,
    viewer_id: viewerId,
  });

  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));
  if (!data) throw new PropertyQueryError("This listing is no longer available.");
  return data as unknown as PropertyDetailsResponse;
}

/** Best-effort — a failed view count bump should never block the detail screen. */
export async function incrementPropertyView(propertyId: string): Promise<void> {
  try {
    await supabase.rpc("increment_property_view", { target_property_id: propertyId });
  } catch {
    // non-fatal
  }
}

export async function addFavorite(profileId: string, propertyId: string): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .insert({ profile_id: profileId, property_id: propertyId });
  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));
}

export async function removeFavorite(profileId: string, propertyId: string): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("profile_id", profileId)
    .eq("property_id", propertyId);
  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));
}

export async function getFavoritePropertyIds(profileId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select("property_id")
    .eq("profile_id", profileId);
  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));
  return (data ?? []).map((row) => row.property_id);
}

export async function getAmenities(): Promise<Amenity[]> {
  const { data, error } = await supabase.from("amenities").select("*").order("name");
  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));
  return (data ?? []) as Amenity[];
}

export async function getCounties(): Promise<string[]> {
  const { data, error } = await supabase.from("locations").select("county").order("county");
  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));
  return Array.from(new Set((data ?? []).map((row) => row.county)));
}

export async function getTownsForCounty(county: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("town")
    .eq("county", county)
    .order("town");
  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));
  return Array.from(new Set((data ?? []).map((row) => row.town)));
}

export type { LocationRow };

// ---------------------------------------------------------------------------
// Phase 4: Landlord / caretaker dashboard
// ---------------------------------------------------------------------------

/** Fields a landlord/caretaker can set when creating or editing a listing. */
export type PropertyFormInput = Omit<
  Property,
  | "id"
  | "landlord_id"
  | "view_count"
  | "favorite_count"
  | "created_at"
  | "updated_at"
>;

export interface LandlordPropertyRow extends Property {
  cover_image_url: string | null;
  pending_viewing_requests: number;
}

/** "My properties" list for the landlord dashboard — includes cover image and pending request count. */
export async function getMyProperties(profileId: string): Promise<LandlordPropertyRow[]> {
  const { data, error } = await supabase
    .from("properties")
    .select(
      "*, property_images(secure_url, sort_order), viewing_requests(id, status)",
    )
    .or(`landlord_id.eq.${profileId},caretaker_id.eq.${profileId}`)
    .order("created_at", { ascending: false });

  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));

  return (data ?? []).map((row) => {
    const images = (row.property_images ?? []) as { secure_url: string; sort_order: number }[];
    const cover = [...images].sort((a, b) => a.sort_order - b.sort_order)[0];
    const requests = (row.viewing_requests ?? []) as { id: string; status: ViewingStatus }[];
    const pending = requests.filter((r) => r.status === "pending").length;
    const { property_images, viewing_requests, ...propertyFields } = row as typeof row & {
      property_images?: unknown;
      viewing_requests?: unknown;
    };

    return {
      ...(propertyFields as Property),
      cover_image_url: cover?.secure_url ?? null,
      pending_viewing_requests: pending,
    };
  });
}

export async function getPropertyForEdit(propertyId: string): Promise<Property> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .single();
  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));
  return data as Property;
}

export async function createProperty(
  landlordId: string,
  input: PropertyFormInput,
): Promise<string> {
  const { data, error } = await supabase
    .from("properties")
    .insert({ ...input, landlord_id: landlordId })
    .select("id")
    .single();
  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));
  return data.id as string;
}

export async function updateProperty(
  propertyId: string,
  patch: Partial<PropertyFormInput>,
): Promise<void> {
  const { error } = await supabase.from("properties").update(patch).eq("id", propertyId);
  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));
}

export async function deleteProperty(propertyId: string): Promise<void> {
  const { error } = await supabase.from("properties").delete().eq("id", propertyId);
  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));
}

export async function getPropertyImages(propertyId: string): Promise<PropertyImage[]> {
  const { data, error } = await supabase
    .from("property_images")
    .select("*")
    .eq("property_id", propertyId)
    .order("sort_order");
  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));
  return (data ?? []) as PropertyImage[];
}

export async function addPropertyImages(
  propertyId: string,
  images: {
    cloudinary_public_id: string;
    secure_url: string;
    width: number;
    height: number;
    sort_order: number;
  }[],
): Promise<void> {
  if (images.length === 0) return;
  const { error } = await supabase
    .from("property_images")
    .insert(images.map((img) => ({ property_id: propertyId, ...img })));
  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));
}

export async function deletePropertyImage(imageId: string): Promise<void> {
  const { error } = await supabase.from("property_images").delete().eq("id", imageId);
  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));
}

/** Persists a new photo order (and therefore a new cover photo — index 0). */
export async function reorderPropertyImages(
  propertyId: string,
  orderedImageIds: string[],
): Promise<void> {
  await Promise.all(
    orderedImageIds.map((imageId, index) =>
      supabase.from("property_images").update({ sort_order: index }).eq("id", imageId),
    ),
  ).then((results) => {
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new PropertyQueryError(toFriendlyDatabaseError(failed.error));
  });
}

export interface CaretakerOption {
  profileId: string;
  fullName: string | null;
  phone: string | null;
}

/** Caretakers a landlord has on file, for the "assign caretaker" picker on the property form. */
export async function getMyCaretakers(landlordId: string): Promise<CaretakerOption[]> {
  const { data, error } = await supabase
    .from("property_managers")
    .select("profile_id, profiles!inner(full_name, phone)")
    .eq("managed_by_landlord", landlordId);

  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));

  return (data ?? []).map((row) => {
    const profile = row.profiles as unknown as { full_name: string | null; phone: string | null };
    return { profileId: row.profile_id, fullName: profile?.full_name ?? null, phone: profile?.phone ?? null };
  });
}

export interface LandlordViewingRequest extends ViewingRequest {
  property_title: string;
  tenant_name: string | null;
  tenant_phone: string | null;
}

/**
 * Viewing request inbox for a landlord/caretaker, across all of their properties.
 *
 * Deliberately avoids embedding `profiles` via a guessed FK constraint name
 * (e.g. `tenant:profiles!viewing_requests_tenant_id_fkey`) since that name is
 * generated by Postgres and isn't guaranteed until confirmed against the real
 * project. Instead this does two round trips: fetch requests + property info,
 * then batch-fetch the distinct tenant profiles by id. Slightly more requests,
 * but has no hidden dependency on schema internals.
 */
export async function getViewingRequestsForLandlord(
  profileId: string,
): Promise<LandlordViewingRequest[]> {
  const { data, error } = await supabase
    .from("viewing_requests")
    .select("*, properties!inner(title, landlord_id, caretaker_id)")
    .or(`landlord_id.eq.${profileId},caretaker_id.eq.${profileId}`, {
      foreignTable: "properties",
    })
    .order("requested_date", { ascending: true });

  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));

  const rows = data ?? [];
  const tenantIds = Array.from(new Set(rows.map((row) => row.tenant_id).filter(Boolean)));

  let tenantsById = new Map<string, { full_name: string | null; phone: string | null }>();
  if (tenantIds.length > 0) {
    const { data: tenants, error: tenantsError } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", tenantIds);
    if (tenantsError) throw new PropertyQueryError(toFriendlyDatabaseError(tenantsError));
    tenantsById = new Map((tenants ?? []).map((t) => [t.id, { full_name: t.full_name, phone: t.phone }]));
  }

  return rows.map((row) => {
    const properties = row.properties as unknown as { title: string };
    const tenant = tenantsById.get(row.tenant_id);
    const { properties: _p, ...rest } = row as typeof row & { properties?: unknown };

    return {
      ...(rest as ViewingRequest),
      property_title: properties?.title ?? "Listing",
      tenant_name: tenant?.full_name ?? null,
      tenant_phone: tenant?.phone ?? null,
    };
  });
}

export async function updateViewingRequestStatus(
  requestId: string,
  status: ViewingStatus,
  responderId: string,
): Promise<void> {
  const { error } = await supabase
    .from("viewing_requests")
    .update({ status, responder_id: responderId })
    .eq("id", requestId);
  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));
}

export interface DailyViewCount {
  day: string;
  view_count: number;
}

/** Day-bucketed view counts across all of a landlord/caretaker's properties, for charting. */
export async function getViewsOverTime(profileId: string, daysBack = 30): Promise<DailyViewCount[]> {
  const { data, error } = await supabase.rpc("landlord_views_over_time", {
    profile_id: profileId,
    days_back: daysBack,
  });
  if (error) throw new PropertyQueryError(toFriendlyDatabaseError(error));
  return (data ?? []) as DailyViewCount[];
}

export interface LandlordAnalyticsSummary {
  totalProperties: number;
  availableCount: number;
  occupiedCount: number;
  totalViews: number;
  totalFavorites: number;
  pendingViewingRequests: number;
}

/** Basic analytics rollup for the dashboard header — computed client-side from "my properties". */
export function summarizeLandlordAnalytics(
  properties: LandlordPropertyRow[],
): LandlordAnalyticsSummary {
  return properties.reduce<LandlordAnalyticsSummary>(
    (acc, p) => ({
      totalProperties: acc.totalProperties + 1,
      availableCount: acc.availableCount + (p.status === "available" ? 1 : 0),
      occupiedCount: acc.occupiedCount + (p.status === "occupied" ? 1 : 0),
      totalViews: acc.totalViews + p.view_count,
      totalFavorites: acc.totalFavorites + p.favorite_count,
      pendingViewingRequests: acc.pendingViewingRequests + p.pending_viewing_requests,
    }),
    {
      totalProperties: 0,
      availableCount: 0,
      occupiedCount: 0,
      totalViews: 0,
      totalFavorites: 0,
      pendingViewingRequests: 0,
    },
  );
}
