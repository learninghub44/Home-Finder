import { useCallback } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import {
  addFavorite,
  getAmenities,
  getCounties,
  getFavoritePropertyIds,
  getPropertyDetails,
  getTownsForCounty,
  incrementPropertyView,
  removeFavorite,
  searchProperties,
} from "@/lib/properties";
import { useAuth } from "./useAuth";
import type { PropertyCard, SearchFilters } from "@/types/database";
import type { UserCoords } from "./useUserLocation";

const propertiesKey = {
  search: (filters: SearchFilters) => ["properties", "search", filters] as const,
  details: (id: string, viewerId: string | null) =>
    ["properties", "details", id, viewerId] as const,
  amenities: () => ["amenities"] as const,
  counties: () => ["locations", "counties"] as const,
  towns: (county: string) => ["locations", "towns", county] as const,
  favoriteIds: (profileId: string) => ["favorites", "ids", profileId] as const,
};

export function useSearchProperties(filters: SearchFilters, enabled = true) {
  const { profile } = useAuth();
  const resolvedFilters: SearchFilters = { viewer_id: profile?.id ?? null, ...filters };

  return useQuery({
    queryKey: propertiesKey.search(resolvedFilters),
    queryFn: () => searchProperties(resolvedFilters),
    enabled,
  });
}

const PAGE_SIZE = 20;

/** Paginated search results for the Search + Filters screen and Favorites screen. */
export function useInfiniteSearchProperties(filters: Omit<SearchFilters, "page_offset">) {
  const { profile } = useAuth();
  const resolvedFilters: Omit<SearchFilters, "page_offset"> = {
    viewer_id: profile?.id ?? null,
    page_limit: PAGE_SIZE,
    ...filters,
  };

  return useInfiniteQuery({
    queryKey: ["properties", "search", "infinite", resolvedFilters],
    queryFn: ({ pageParam }) =>
      searchProperties({ ...resolvedFilters, page_offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
  });
}

/** Powers the Home screen's featured / nearby / recent / by-type sections in parallel. */
export function useHomeFeed(coords: UserCoords | null) {
  const { profile } = useAuth();
  const viewerId = profile?.id ?? null;

  const featured = useQuery({
    queryKey: propertiesKey.search({ viewer_id: viewerId, sort_by: "newest", page_limit: 10 }),
    queryFn: () => searchProperties({ viewer_id: viewerId, sort_by: "newest", page_limit: 10 }),
  });

  const nearby = useQuery({
    queryKey: propertiesKey.search({
      viewer_id: viewerId,
      user_lat: coords?.latitude,
      user_lng: coords?.longitude,
      radius_meters: 10000,
      sort_by: "nearest",
      page_limit: 10,
    }),
    queryFn: () =>
      searchProperties({
        viewer_id: viewerId,
        user_lat: coords?.latitude,
        user_lng: coords?.longitude,
        radius_meters: 10000,
        sort_by: "nearest",
        page_limit: 10,
      }),
    enabled: !!coords,
  });

  const recent = useQuery({
    queryKey: propertiesKey.search({
      viewer_id: viewerId,
      sort_by: "newest",
      page_limit: 10,
      page_offset: 10,
    }),
    queryFn: () =>
      searchProperties({
        viewer_id: viewerId,
        sort_by: "newest",
        page_limit: 10,
        page_offset: 10,
      }),
  });

  const bedsitters = useQuery({
    queryKey: propertiesKey.search({
      viewer_id: viewerId,
      property_types: ["bedsitter", "one_bedroom"],
      sort_by: "newest",
      page_limit: 10,
    }),
    queryFn: () =>
      searchProperties({
        viewer_id: viewerId,
        property_types: ["bedsitter", "one_bedroom"],
        sort_by: "newest",
        page_limit: 10,
      }),
  });

  const refetchAll = useCallback(async () => {
    await Promise.all([
      featured.refetch(),
      coords ? nearby.refetch() : Promise.resolve(),
      recent.refetch(),
      bedsitters.refetch(),
    ]);
  }, [featured, nearby, recent, bedsitters, coords]);

  return {
    featured,
    nearby,
    recent,
    bedsitters,
    isRefreshing:
      featured.isRefetching ||
      nearby.isRefetching ||
      recent.isRefetching ||
      bedsitters.isRefetching,
    refetchAll,
  };
}

export function usePropertyDetails(propertyId: string | undefined) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: propertiesKey.details(propertyId ?? "", profile?.id ?? null),
    queryFn: () => getPropertyDetails(propertyId as string, profile?.id ?? null),
    enabled: !!propertyId,
  });
}

export function useRecordPropertyView(propertyId: string | undefined) {
  return useCallback(() => {
    if (propertyId) incrementPropertyView(propertyId);
  }, [propertyId]);
}

export function useAmenities() {
  return useQuery({ queryKey: propertiesKey.amenities(), queryFn: getAmenities });
}

export function useCounties() {
  return useQuery({ queryKey: propertiesKey.counties(), queryFn: getCounties });
}

export function useTownsForCounty(county: string | null) {
  return useQuery({
    queryKey: propertiesKey.towns(county ?? ""),
    queryFn: () => getTownsForCounty(county as string),
    enabled: !!county,
  });
}

export function useFavoritePropertyIds() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: propertiesKey.favoriteIds(profile?.id ?? ""),
    queryFn: () => getFavoritePropertyIds(profile?.id as string),
    enabled: !!profile?.id,
  });
}

/**
 * Toggles a favorite with an optimistic update against every cached
 * "search_properties" result list currently in the cache, so the heart icon
 * flips instantly everywhere the property card appears (Home, Search, Map,
 * Favorites) without waiting on a refetch.
 */
export function useToggleFavorite() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      propertyId,
      isFavorited,
    }: {
      propertyId: string;
      isFavorited: boolean;
    }) => {
      if (!profile?.id) throw new Error("Sign in to save favorites.");
      if (isFavorited) {
        await removeFavorite(profile.id, propertyId);
      } else {
        await addFavorite(profile.id, propertyId);
      }
    },
    onMutate: async ({ propertyId, isFavorited }) => {
      await queryClient.cancelQueries({ queryKey: ["properties", "search"] });
      const previousQueries = queryClient.getQueriesData<PropertyCard[]>({
        queryKey: ["properties", "search"],
      });

      previousQueries.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData<PropertyCard[]>(
          key,
          data.map((card) =>
            card.id === propertyId
              ? {
                  ...card,
                  is_favorited: !isFavorited,
                  favorite_count: card.favorite_count + (isFavorited ? -1 : 1),
                }
              : card,
          ),
        );
      });

      return { previousQueries };
    },
    onError: (err, _vars, context) => {
      context?.previousQueries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      Toast.show({
        type: "error",
        text1: "Couldn't update favorite",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["properties", "search"] });
      queryClient.invalidateQueries({ queryKey: ["properties", "details"] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}
