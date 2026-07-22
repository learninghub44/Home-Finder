import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { ArrowLeft, Bookmark, ChevronRight, Trash2 } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { useDeleteSavedSearch, useSavedSearches } from "@/hooks/useSavedSearches";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import type { SavedSearch } from "@/lib/savedSearches";

function describeFilters(filters: SavedSearch["filters"]): string {
  const parts: string[] = [];
  if (filters.search_text) parts.push(`"${filters.search_text}"`);
  if (filters.county_filter) parts.push(filters.county_filter);
  if (filters.town_filter) parts.push(filters.town_filter);
  if (filters.property_types?.length) parts.push(filters.property_types.join(", "));
  if (filters.bedrooms_filter) parts.push(`${filters.bedrooms_filter}+ bed`);
  if (filters.min_rent || filters.max_rent) {
    parts.push(`KES ${filters.min_rent ?? 0}–${filters.max_rent ?? "∞"}`);
  }
  return parts.length ? parts.join(" · ") : "All listings";
}

export default function SavedSearchesScreen() {
  const { session, isInitializing } = useAuth();
  const { data: searches, isLoading, isError, refetch } = useSavedSearches();
  const deleteSearch = useDeleteSavedSearch();

  if (isInitializing) return null;
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <View className="flex-1 bg-white dark:bg-surface-dark">
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}>
          <ArrowLeft size={22} color="#0B1F17" />
        </Pressable>
        <Text className="text-lg font-bold text-brand-900 dark:text-white">Saved searches</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2C7A4B" />
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={searches ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pb-10 pt-2"
          ListEmptyComponent={
            <EmptyState
              icon={Bookmark}
              title="No saved searches"
              message="Save a search from the search screen and we'll notify you when a new listing matches."
              actionLabel="Browse listings"
              onAction={() => router.push("/search")}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/search",
                  params: { savedFilters: JSON.stringify(item.filters) },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Apply saved search ${item.name}`}
              className="mb-2 flex-row items-center rounded-xl bg-muted-light p-3.5 dark:bg-muted-dark"
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-surface-dark">
                <Bookmark size={16} color="#2C7A4B" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-semibold text-brand-900 dark:text-white" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="mt-0.5 text-xs text-gray-500" numberOfLines={1}>
                  {describeFilters(item.filters)}
                </Text>
              </View>
              <Pressable
                onPress={() => deleteSearch.mutate(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`Delete saved search ${item.name}`}
                hitSlop={10}
                className="ml-2 p-1.5"
              >
                <Trash2 size={16} color="#D9463C" />
              </Pressable>
              <ChevronRight size={16} color="#8A968E" />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
