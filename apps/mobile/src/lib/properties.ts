import { supabase } from "./supabase";
import { toFriendlyDatabaseError } from "./errors";
import type {
  Amenity,
  LocationRow,
  PropertyCard,
  PropertyDetailsResponse,
  SearchFilters,
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
