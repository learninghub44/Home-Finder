import { useCallback } from "react";
import { FlatList, Text, View } from "react-native";
import { router } from "expo-router";
import { Heart } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { useFavoritePropertyIds, useSearchProperties, useToggleFavorite } from "@/hooks/useProperties";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyCardSkeleton } from "@/components/PropertyCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { AppButton } from "@/components/AppButton";
import type { PropertyCard as PropertyCardType } from "@/types/database";

export default function FavoritesScreen() {
  const { profile } = useAuth();
  const { data: favoriteIds, isLoading: idsLoading } = useFavoritePropertyIds();
  const toggleFavorite = useToggleFavorite();

  const {
    data: favorites,
    isLoading,
    isError,
    refetch,
  } = useSearchProperties(
    { property_ids: favoriteIds ?? [], sort_by: "newest", page_limit: 100 },
    !!favoriteIds && favoriteIds.length > 0,
  );

  const openProperty = useCallback((id: string) => {
    router.push(`/property/${id}`);
  }, []);

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8 dark:bg-surface-dark">
        <EmptyState
          icon={Heart}
          title="Sign in to see your favorites"
          message="Save listings you like and find them here later."
          actionLabel="Sign in"
          onAction={() => router.push("/(auth)/login")}
        />
      </View>
    );
  }

  const anyLoading = idsLoading || (isLoading && (favoriteIds?.length ?? 0) > 0);

  return (
    <View className="flex-1 bg-white dark:bg-surface-dark">
      <View className="px-4 pb-2 pt-14">
        <Text className="text-2xl font-bold text-brand-900 dark:text-white">Favorites</Text>
      </View>

      {anyLoading ? (
        <View className="gap-3 px-4 pt-2">
          {[1, 2, 3].map((i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </View>
      ) : isError ? (
        <ErrorState message="Couldn't load your favorites." onRetry={refetch} />
      ) : !favoriteIds || favoriteIds.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          message="Tap the heart on any listing to save it here."
          actionLabel="Browse listings"
          onAction={() => router.push("/search")}
        />
      ) : (
        <FlatList
          data={favorites ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-3 px-4 pb-8 pt-2"
          renderItem={({ item }: { item: PropertyCardType }) => (
            <PropertyCard
              property={item}
              onPress={() => openProperty(item.id)}
              onToggleFavorite={() =>
                toggleFavorite.mutate({ propertyId: item.id, isFavorited: item.is_favorited })
              }
            />
          )}
        />
      )}

      {favoriteIds && favoriteIds.length > 0 ? (
        <View className="px-4 pb-4">
          <AppButton label="Browse more listings" variant="ghost" onPress={() => router.push("/search")} />
        </View>
      ) : null}
    </View>
  );
}
