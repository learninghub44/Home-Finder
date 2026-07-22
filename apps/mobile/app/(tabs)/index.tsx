import { useCallback } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Bell, Search, SlidersHorizontal } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useHomeFeed, useToggleFavorite } from "@/hooks/useProperties";
import { useUnreadNotificationCount } from "@/hooks/useNotifications";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyCardSkeletonRow } from "@/components/PropertyCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { SectionHeader } from "@/components/SectionHeader";
import type { PropertyCard as PropertyCardType } from "@/types/database";

export default function Home() {
  const { profile } = useAuth();
  const { coords, permissionDenied } = useUserLocation();
  const { featured, nearby, recent, bedsitters, isRefreshing, refetchAll } =
    useHomeFeed(coords);
  const toggleFavorite = useToggleFavorite();
  const { data: unreadCount } = useUnreadNotificationCount();

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

  const anyLoading =
    featured.isLoading || recent.isLoading || bedsitters.isLoading || nearby.isLoading;
  const anyError = featured.isError && recent.isError && bedsitters.isError;

  if (anyError) {
    return (
      <View className="flex-1 bg-white dark:bg-surface-dark">
        <ErrorState
          message="Couldn't load listings. Check your connection and try again."
          onRetry={refetchAll}
        />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-surface-dark"
      contentContainerClassName="pb-8"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refetchAll} tintColor="#2C7A4B" />
      }
    >
      {/* Header */}
      <View className="px-4 pb-4 pt-14">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-sm text-gray-500">
              {profile?.full_name ? `Hi ${profile.full_name.split(" ")[0]},` : "Welcome,"}
            </Text>
            <Text className="text-2xl font-bold text-brand-900 dark:text-white">
              Find your next home
            </Text>
          </View>
          {profile ? (
            <Pressable
              onPress={() => router.push("/notifications")}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              className="relative mt-1 h-10 w-10 items-center justify-center rounded-full bg-muted-light dark:bg-muted-dark"
            >
              <Bell size={18} color="#0B1F17" />
              {unreadCount ? (
                <View className="absolute -right-0.5 -top-0.5 h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-500 px-1">
                  <Text className="text-[9px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={() => router.push("/search")}
          accessibilityRole="button"
          accessibilityLabel="Search listings"
          className="mt-4 flex-row items-center rounded-xl border border-gray-200 bg-muted-light px-4 py-3.5 dark:border-gray-700 dark:bg-muted-dark"
        >
          <Search size={18} color="#8A968E" />
          <Text className="ml-3 flex-1 text-sm text-gray-500">
            Search by location, price, type...
          </Text>
          <SlidersHorizontal size={18} color="#8A968E" />
        </Pressable>
      </View>

      {permissionDenied ? (
        <View className="mx-4 mb-2 rounded-xl bg-muted-light p-3 dark:bg-muted-dark">
          <Text className="text-xs text-gray-500">
            Enable location access to see homes near you.
          </Text>
        </View>
      ) : null}

      {/* Featured */}
      <View className="mb-6">
        <SectionHeader
          title="Featured listings"
          onSeeAll={() => router.push("/search?sort=newest")}
        />
        <HorizontalSection
          data={featured.data}
          isLoading={featured.isLoading}
          isError={featured.isError}
          onRetry={featured.refetch}
          onPress={openProperty}
          onToggleFavorite={handleToggleFavorite}
          emptyMessage="No listings yet — check back soon."
        />
      </View>

      {/* Nearby */}
      {!permissionDenied ? (
        <View className="mb-6">
          <SectionHeader
            title="Near you"
            subtitle={coords ? undefined : "Turn on location to see this"}
            onSeeAll={coords ? () => router.push("/search?sort=nearest") : undefined}
          />
          <HorizontalSection
            data={nearby.data}
            isLoading={nearby.isLoading || (!coords && !permissionDenied)}
            isError={nearby.isError}
            onRetry={nearby.refetch}
            onPress={openProperty}
            onToggleFavorite={handleToggleFavorite}
            emptyMessage="No listings found within 10km of you yet."
          />
        </View>
      ) : null}

      {/* Budget-friendly */}
      <View className="mb-6">
        <SectionHeader
          title="Budget-friendly"
          subtitle="Bedsitters & 1 bedrooms"
          onSeeAll={() => router.push("/search?type=bedsitter,one_bedroom")}
        />
        <HorizontalSection
          data={bedsitters.data}
          isLoading={bedsitters.isLoading}
          isError={bedsitters.isError}
          onRetry={bedsitters.refetch}
          onPress={openProperty}
          onToggleFavorite={handleToggleFavorite}
          emptyMessage="No budget listings yet."
        />
      </View>

      {/* Recently added */}
      <View>
        <SectionHeader title="Recently added" />
        <HorizontalSection
          data={recent.data}
          isLoading={recent.isLoading}
          isError={recent.isError}
          onRetry={recent.refetch}
          onPress={openProperty}
          onToggleFavorite={handleToggleFavorite}
          emptyMessage="Nothing new to show yet."
        />
      </View>

      {!anyLoading &&
      (featured.data?.length ?? 0) === 0 &&
      (recent.data?.length ?? 0) === 0 &&
      (bedsitters.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="No listings yet"
          message="Home Finder is just getting started in your area. Check back soon."
        />
      ) : null}
    </ScrollView>
  );
}

interface HorizontalSectionProps {
  data: PropertyCardType[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onPress: (id: string) => void;
  onToggleFavorite: (property: PropertyCardType) => void;
  emptyMessage: string;
}

function HorizontalSection({
  data,
  isLoading,
  isError,
  onRetry,
  onPress,
  onToggleFavorite,
  emptyMessage,
}: HorizontalSectionProps) {
  if (isLoading) {
    return (
      <View className="px-4">
        <PropertyCardSkeletonRow />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="px-4">
        <Pressable
          onPress={onRetry}
          className="items-center rounded-xl border border-dashed border-gray-300 py-6 dark:border-gray-700"
        >
          <Text className="text-sm text-danger">Couldn't load — tap to retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View className="px-4">
        <View className="items-center rounded-xl bg-muted-light py-6 dark:bg-muted-dark">
          <Text className="text-sm text-gray-500">{emptyMessage}</Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      contentContainerClassName="gap-3 px-4"
      renderItem={({ item }) => (
        <PropertyCard
          property={item}
          variant="compact"
          onPress={() => onPress(item.id)}
          onToggleFavorite={() => onToggleFavorite(item)}
        />
      )}
    />
  );
}
