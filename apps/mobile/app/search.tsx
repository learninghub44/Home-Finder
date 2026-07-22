import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, BookmarkPlus, Search, SlidersHorizontal, X } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useInfiniteSearchProperties, useToggleFavorite } from "@/hooks/useProperties";
import { useCreateSavedSearch } from "@/hooks/useSavedSearches";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyCardSkeleton } from "@/components/PropertyCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Chip } from "@/components/Chip";
import { SaveSearchModal } from "@/components/SaveSearchModal";
import { EMPTY_FILTERS, FilterSheet, type FilterState } from "@/components/FilterSheet";
import type { PropertyCard as PropertyCardType, PropertyType, SortBy } from "@/types/database";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to high" },
  { value: "price_desc", label: "Price: High to low" },
  { value: "nearest", label: "Nearest" },
];

export default function SearchScreen() {
  const params = useLocalSearchParams<{ sort?: string; type?: string; q?: string; savedFilters?: string }>();
  const { profile } = useAuth();
  const { coords } = useUserLocation();
  const toggleFavorite = useToggleFavorite();

  const parsedSavedFilters = useMemo(() => {
    if (!params.savedFilters) return null;
    try {
      return JSON.parse(params.savedFilters) as {
        search_text?: string | null;
        min_rent?: number | null;
        max_rent?: number | null;
        bedrooms_filter?: number | null;
        property_types?: PropertyType[] | null;
        county_filter?: string | null;
        town_filter?: string | null;
      };
    } catch {
      return null;
    }
  }, [params.savedFilters]);

  const [searchInput, setSearchInput] = useState(parsedSavedFilters?.search_text ?? params.q ?? "");
  const [searchText, setSearchText] = useState(parsedSavedFilters?.search_text ?? params.q ?? "");
  const [sortBy, setSortBy] = useState<SortBy>((params.sort as SortBy) ?? "newest");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [saveSearchVisible, setSaveSearchVisible] = useState(false);
  const createSavedSearch = useCreateSavedSearch();
  const [filters, setFilters] = useState<FilterState>(
    parsedSavedFilters
      ? {
          ...EMPTY_FILTERS,
          minRent: parsedSavedFilters.min_rent ? String(parsedSavedFilters.min_rent) : "",
          maxRent: parsedSavedFilters.max_rent ? String(parsedSavedFilters.max_rent) : "",
          bedrooms: parsedSavedFilters.bedrooms_filter ?? null,
          propertyTypes: parsedSavedFilters.property_types ?? [],
          county: parsedSavedFilters.county_filter ?? null,
          town: parsedSavedFilters.town_filter ?? null,
        }
      : {
          ...EMPTY_FILTERS,
          propertyTypes: (params.type?.split(",").filter(Boolean) as PropertyType[]) ?? [],
        },
  );

  // Debounce free-text search input.
  useEffect(() => {
    const timer = setTimeout(() => setSearchText(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const resolvedFilters = useMemo(
    () => ({
      search_text: searchText || null,
      min_rent: filters.minRent ? Number(filters.minRent) : null,
      max_rent: filters.maxRent ? Number(filters.maxRent) : null,
      bedrooms_filter: filters.bedrooms,
      property_types: filters.propertyTypes.length ? filters.propertyTypes : null,
      amenity_ids: filters.amenityIds.length ? filters.amenityIds : null,
      county_filter: filters.county,
      town_filter: filters.town,
      user_lat: sortBy === "nearest" ? coords?.latitude : null,
      user_lng: sortBy === "nearest" ? coords?.longitude : null,
      radius_meters: sortBy === "nearest" ? 50000 : null,
      sort_by: sortBy,
    }),
    [searchText, filters, sortBy, coords],
  );

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteSearchProperties(resolvedFilters);

  const results = useMemo(() => data?.pages.flat() ?? [], [data]);

  const openProperty = useCallback((id: string) => {
    router.push(`/property/${id}`);
  }, []);

  const handleToggleFavorite = useCallback(
    (property: PropertyCardType) => {
      if (!profile?.id) {
        router.push("/(auth)/login");
        return;
      }
      toggleFavorite.mutate({ propertyId: property.id, isFavorited: property.is_favorited });
    },
    [profile?.id, toggleFavorite],
  );

  const activeFilterCount =
    (filters.minRent ? 1 : 0) +
    (filters.maxRent ? 1 : 0) +
    (filters.bedrooms !== null ? 1 : 0) +
    filters.propertyTypes.length +
    filters.amenityIds.length +
    (filters.county ? 1 : 0);

  return (
    <View className="flex-1 bg-white dark:bg-surface-dark">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}>
          <ArrowLeft size={22} color="#0B1F17" />
        </Pressable>
        <View className="flex-1 flex-row items-center rounded-xl border border-gray-200 bg-muted-light px-3 py-2.5 dark:border-gray-700 dark:bg-muted-dark">
          <Search size={17} color="#8A968E" />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search by location, title..."
            placeholderTextColor="#8A968E"
            className="ml-2 flex-1 text-sm text-brand-900 dark:text-white"
            returnKeyType="search"
            accessibilityLabel="Search listings"
          />
          {searchInput ? (
            <Pressable onPress={() => setSearchInput("")} hitSlop={8}>
              <X size={16} color="#8A968E" />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => setFiltersVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          className="relative h-11 w-11 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <SlidersHorizontal size={18} color="#0B1F17" />
          {activeFilterCount ? (
            <View className="absolute -right-1 -top-1 h-4 w-4 items-center justify-center rounded-full bg-brand-500">
              <Text className="text-[10px] font-bold text-white">{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
        {activeFilterCount || searchText ? (
          <Pressable
            onPress={() => {
              if (!profile?.id) {
                router.push("/(auth)/login");
                return;
              }
              setSaveSearchVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Save this search"
            className="h-11 w-11 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700"
          >
            <BookmarkPlus size={18} color="#0B1F17" />
          </Pressable>
        ) : null}
      </View>

      {/* Sort chips */}
      <View className="flex-row flex-wrap px-4 pb-2">
        {SORT_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={sortBy === opt.value}
            onPress={() => setSortBy(opt.value)}
          />
        ))}
      </View>

      {/* Results */}
      {isLoading ? (
        <View className="gap-3 px-4 pt-2">
          {[1, 2, 3].map((i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </View>
      ) : isError ? (
        <ErrorState message="Couldn't load listings. Check your connection and try again." onRetry={refetch} />
      ) : results.length === 0 ? (
        <EmptyState
          title="No listings match your search"
          message="Try adjusting your filters or search terms."
          actionLabel={activeFilterCount ? "Clear filters" : undefined}
          onAction={activeFilterCount ? () => setFilters(EMPTY_FILTERS) : undefined}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-3 px-4 pb-8 pt-2"
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              onPress={() => openProperty(item.id)}
              onToggleFavorite={() => handleToggleFavorite(item)}
            />
          )}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4">
                <ActivityIndicator color="#2C7A4B" />
              </View>
            ) : null
          }
          ListHeaderComponent={
            <Text className="mb-1 text-xs text-gray-500">
              {results.length} listing{results.length === 1 ? "" : "s"} found
            </Text>
          }
        />
      )}

      <FilterSheet
        visible={filtersVisible}
        initialFilters={filters}
        onClose={() => setFiltersVisible(false)}
        onApply={(next) => {
          setFilters(next);
          setFiltersVisible(false);
        }}
      />

      <SaveSearchModal
        visible={saveSearchVisible}
        isSubmitting={createSavedSearch.isPending}
        onClose={() => setSaveSearchVisible(false)}
        onSubmit={(name) => {
          createSavedSearch.mutate(
            {
              name,
              filters: {
                search_text: resolvedFilters.search_text,
                min_rent: resolvedFilters.min_rent,
                max_rent: resolvedFilters.max_rent,
                bedrooms_filter: resolvedFilters.bedrooms_filter,
                property_types: resolvedFilters.property_types,
                county_filter: resolvedFilters.county_filter,
                town_filter: resolvedFilters.town_filter,
              },
            },
            { onSuccess: () => setSaveSearchVisible(false) },
          );
        }}
      />
    </View>
  );
}
