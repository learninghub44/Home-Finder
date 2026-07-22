import { supabase } from "./supabase";
import { toFriendlyDatabaseError } from "./errors";
import type { SavedSearch, SavedSearchFilters } from "@/types/database";

export class SavedSearchError extends Error {}

export type { SavedSearch, SavedSearchFilters };

export async function getMySavedSearches(profileId: string): Promise<SavedSearch[]> {
  const { data, error } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw new SavedSearchError(toFriendlyDatabaseError(error));
  return (data ?? []) as SavedSearch[];
}

export async function createSavedSearch(params: {
  profileId: string;
  name: string;
  filters: SavedSearchFilters;
}): Promise<void> {
  const { error } = await supabase.from("saved_searches").insert({
    profile_id: params.profileId,
    name: params.name,
    filters: params.filters,
  });
  if (error) throw new SavedSearchError(toFriendlyDatabaseError(error));
}

export async function deleteSavedSearch(id: string): Promise<void> {
  const { error } = await supabase.from("saved_searches").delete().eq("id", id);
  if (error) throw new SavedSearchError(toFriendlyDatabaseError(error));
}
