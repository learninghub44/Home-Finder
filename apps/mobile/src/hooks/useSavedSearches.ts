import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import {
  createSavedSearch,
  deleteSavedSearch,
  getMySavedSearches,
  type SavedSearchFilters,
} from "@/lib/savedSearches";
import { useAuth } from "./useAuth";

const savedSearchesKey = (profileId: string) => ["saved-searches", profileId] as const;

export function useSavedSearches() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: savedSearchesKey(profile?.id ?? ""),
    queryFn: () => getMySavedSearches(profile?.id as string),
    enabled: !!profile?.id,
  });
}

export function useCreateSavedSearch() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, filters }: { name: string; filters: SavedSearchFilters }) => {
      if (!profile?.id) throw new Error("Sign in to save a search.");
      await createSavedSearch({ profileId: profile.id, name, filters });
    },
    onSuccess: () => {
      if (profile?.id) queryClient.invalidateQueries({ queryKey: savedSearchesKey(profile.id) });
      Toast.show({
        type: "success",
        text1: "Search saved",
        text2: "We'll notify you when a new listing matches.",
      });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't save search",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}

export function useDeleteSavedSearch() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSavedSearch(id),
    onSuccess: () => {
      if (profile?.id) queryClient.invalidateQueries({ queryKey: savedSearchesKey(profile.id) });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't remove saved search",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}
