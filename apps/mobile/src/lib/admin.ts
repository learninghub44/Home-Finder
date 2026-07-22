import { supabase } from "./supabase";
import { toFriendlyDatabaseError } from "./errors";
import type {
  Amenity,
  LocationRow,
  PlatformAnalytics,
  Profile,
  Property,
  PropertyStatus,
  Report,
  ReportStatus,
  UserRole,
} from "@/types/database";

export class AdminQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminQueryError";
  }
}

// ---------------------------------------------------------------------------
// Dashboard analytics
// ---------------------------------------------------------------------------

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  const { data, error } = await supabase.rpc("platform_analytics");
  if (error) throw new AdminQueryError(toFriendlyDatabaseError(error));
  // Supabase returns `returns table (...)` RPCs as an array of rows.
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new AdminQueryError("No analytics data returned.");
  return row as PlatformAnalytics;
}

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

export interface AdminUserFilters {
  role?: UserRole | "all";
  search?: string;
  suspendedOnly?: boolean;
  limit?: number;
  offset?: number;
}

export async function getUsers(filters: AdminUserFilters = {}): Promise<Profile[]> {
  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .range(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 30) - 1);

  if (filters.role && filters.role !== "all") {
    query = query.eq("role", filters.role);
  }
  if (filters.suspendedOnly) {
    query = query.eq("is_suspended", true);
  }
  if (filters.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw new AdminQueryError(toFriendlyDatabaseError(error));
  return (data ?? []) as Profile[];
}

export async function setUserSuspended(profileId: string, isSuspended: boolean): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_suspended: isSuspended })
    .eq("id", profileId);
  if (error) throw new AdminQueryError(toFriendlyDatabaseError(error));
}

export async function setUserRole(profileId: string, role: UserRole): Promise<void> {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);
  if (error) throw new AdminQueryError(toFriendlyDatabaseError(error));
}

// ---------------------------------------------------------------------------
// Listing moderation
// ---------------------------------------------------------------------------

export interface AdminPropertyFilters {
  status?: PropertyStatus | "all";
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AdminPropertyRow extends Property {
  cover_image_url: string | null;
  landlord_name: string | null;
  open_report_count: number;
}

/**
 * All listings for the moderation screen, regardless of status or owner —
 * relies on `properties_select_available_or_owner`'s `public.is_admin()`
 * clause to bypass the normal "available or owner" restriction. Landlord
 * names and open-report counts are batch-fetched separately rather than
 * embedded, same reasoning as `getViewingRequestsForLandlord`: no dependency
 * on guessed Postgres FK constraint names.
 */
export async function getAllPropertiesForAdmin(
  filters: AdminPropertyFilters = {},
): Promise<AdminPropertyRow[]> {
  let query = supabase
    .from("properties")
    .select("*, property_images(secure_url, sort_order)")
    .order("created_at", { ascending: false })
    .range(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 30) - 1);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.search) {
    query = query.ilike("title", `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw new AdminQueryError(toFriendlyDatabaseError(error));
  const rows = data ?? [];

  const landlordIds = Array.from(new Set(rows.map((row) => row.landlord_id).filter(Boolean)));
  let landlordsById = new Map<string, string | null>();
  if (landlordIds.length > 0) {
    const { data: landlords, error: landlordsError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", landlordIds);
    if (landlordsError) throw new AdminQueryError(toFriendlyDatabaseError(landlordsError));
    landlordsById = new Map((landlords ?? []).map((l) => [l.id, l.full_name]));
  }

  const propertyIds = rows.map((row) => row.id);
  let openReportCounts = new Map<string, number>();
  if (propertyIds.length > 0) {
    const { data: reports, error: reportsError } = await supabase
      .from("reports")
      .select("property_id")
      .eq("status", "open")
      .in("property_id", propertyIds);
    if (reportsError) throw new AdminQueryError(toFriendlyDatabaseError(reportsError));
    openReportCounts = (reports ?? []).reduce((map, r) => {
      if (!r.property_id) return map;
      map.set(r.property_id, (map.get(r.property_id) ?? 0) + 1);
      return map;
    }, new Map<string, number>());
  }

  return rows.map((row) => {
    const images = (row.property_images ?? []) as { secure_url: string; sort_order: number }[];
    const cover = [...images].sort((a, b) => a.sort_order - b.sort_order)[0];
    const { property_images, ...propertyFields } = row as typeof row & { property_images?: unknown };

    return {
      ...(propertyFields as Property),
      cover_image_url: cover?.secure_url ?? null,
      landlord_name: landlordsById.get(row.landlord_id) ?? null,
      open_report_count: openReportCounts.get(row.id) ?? 0,
    };
  });
}

export async function adminSetPropertyStatus(
  propertyId: string,
  status: PropertyStatus,
): Promise<void> {
  const { error } = await supabase.from("properties").update({ status }).eq("id", propertyId);
  if (error) throw new AdminQueryError(toFriendlyDatabaseError(error));
}

export async function adminDeleteProperty(propertyId: string): Promise<void> {
  const { error } = await supabase.from("properties").delete().eq("id", propertyId);
  if (error) throw new AdminQueryError(toFriendlyDatabaseError(error));
}

// ---------------------------------------------------------------------------
// Report review
// ---------------------------------------------------------------------------

export interface AdminReportRow extends Report {
  reporter_name: string | null;
  reported_user_name: string | null;
  property_title: string | null;
}

export async function getReports(status?: ReportStatus | "all"): Promise<AdminReportRow[]> {
  let query = supabase.from("reports").select("*").order("created_at", { ascending: false });
  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw new AdminQueryError(toFriendlyDatabaseError(error));
  const rows = data ?? [];

  const profileIds = Array.from(
    new Set(rows.flatMap((r) => [r.reporter_id, r.reported_user_id]).filter(Boolean) as string[]),
  );
  let profilesById = new Map<string, string | null>();
  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", profileIds);
    if (profilesError) throw new AdminQueryError(toFriendlyDatabaseError(profilesError));
    profilesById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  }

  const propertyIds = Array.from(new Set(rows.map((r) => r.property_id).filter(Boolean) as string[]));
  let propertiesById = new Map<string, string>();
  if (propertyIds.length > 0) {
    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select("id, title")
      .in("id", propertyIds);
    if (propertiesError) throw new AdminQueryError(toFriendlyDatabaseError(propertiesError));
    propertiesById = new Map((properties ?? []).map((p) => [p.id, p.title]));
  }

  return rows.map((row) => ({
    ...(row as Report),
    reporter_name: profilesById.get(row.reporter_id) ?? null,
    reported_user_name: row.reported_user_id ? profilesById.get(row.reported_user_id) ?? null : null,
    property_title: row.property_id ? propertiesById.get(row.property_id) ?? null : null,
  }));
}

export async function updateReportStatus(reportId: string, status: ReportStatus): Promise<void> {
  const { error } = await supabase.from("reports").update({ status }).eq("id", reportId);
  if (error) throw new AdminQueryError(toFriendlyDatabaseError(error));
}

// ---------------------------------------------------------------------------
// Locations management
// ---------------------------------------------------------------------------

export async function getAllLocationRows(): Promise<LocationRow[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .order("county")
    .order("town");
  if (error) throw new AdminQueryError(toFriendlyDatabaseError(error));
  return (data ?? []) as LocationRow[];
}

export async function createLocation(input: {
  county: string;
  town: string;
  estate?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("locations").insert({
    county: input.county,
    town: input.town,
    estate: input.estate ?? null,
  });
  if (error) throw new AdminQueryError(toFriendlyDatabaseError(error));
}

export async function deleteLocation(locationId: string): Promise<void> {
  const { error } = await supabase.from("locations").delete().eq("id", locationId);
  if (error) throw new AdminQueryError(toFriendlyDatabaseError(error));
}

// ---------------------------------------------------------------------------
// Amenities management
// ---------------------------------------------------------------------------

export async function getAllAmenityRows(): Promise<Amenity[]> {
  const { data, error } = await supabase.from("amenities").select("*").order("name");
  if (error) throw new AdminQueryError(toFriendlyDatabaseError(error));
  return (data ?? []) as Amenity[];
}

export async function createAmenity(input: { name: string; icon?: string | null }): Promise<void> {
  const { error } = await supabase
    .from("amenities")
    .insert({ name: input.name, icon: input.icon ?? null });
  if (error) throw new AdminQueryError(toFriendlyDatabaseError(error));
}

export async function deleteAmenity(amenityId: string): Promise<void> {
  const { error } = await supabase.from("amenities").delete().eq("id", amenityId);
  if (error) throw new AdminQueryError(toFriendlyDatabaseError(error));
}
