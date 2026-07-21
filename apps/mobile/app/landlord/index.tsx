import { useMemo } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import {
  ArrowLeft,
  CalendarClock,
  Eye,
  Heart,
  Home as HomeIcon,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import {
  useDeleteProperty,
  useMyProperties,
  useViewingRequestsInbox,
} from "@/hooks/useLandlordProperties";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { formatPropertyType, formatRentPerMonth } from "@/lib/format";
import type { LandlordPropertyRow } from "@/lib/properties";
import { summarizeLandlordAnalytics } from "@/lib/properties";

const STATUS_STYLES: Record<string, string> = {
  available: "bg-brand-50 text-brand-700 dark:bg-brand-800 dark:text-brand-200",
  occupied: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  reserved: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  removed: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

export default function LandlordDashboardScreen() {
  const { profile } = useAuth();
  const { data: properties, isLoading, isError, refetch, isRefetching } = useMyProperties();
  const { data: requests } = useViewingRequestsInbox();
  const deleteProperty = useDeleteProperty();

  const analytics = useMemo(
    () => summarizeLandlordAnalytics(properties ?? []),
    [properties],
  );
  const pendingCount = useMemo(
    () => (requests ?? []).filter((r) => r.status === "pending").length,
    [requests],
  );

  const confirmDelete = (property: LandlordPropertyRow) => {
    Alert.alert(
      "Delete listing",
      `Delete "${property.title}"? This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteProperty.mutate(property.id),
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-white dark:bg-surface-dark">
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}>
          <ArrowLeft size={22} color="#0B1F17" />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-brand-900 dark:text-white">
          {profile?.role === "property_manager" ? "Caretaker dashboard" : "Landlord dashboard"}
        </Text>
        <Pressable
          onPress={() => router.push("/landlord/property-form")}
          accessibilityRole="button"
          accessibilityLabel="Add property"
          className="h-9 w-9 items-center justify-center rounded-full bg-brand-500"
        >
          <Plus size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2C7A4B" />
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={properties ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          contentContainerClassName="pb-10"
          ListHeaderComponent={
            <View className="px-4 pb-2">
              {/* Analytics summary */}
              <View className="mb-4 flex-row flex-wrap gap-2">
                <StatCard icon={HomeIcon} label="Listings" value={String(analytics.totalProperties)} />
                <StatCard icon={Eye} label="Total views" value={String(analytics.totalViews)} />
                <StatCard icon={Heart} label="Favorites" value={String(analytics.totalFavorites)} />
                <Pressable onPress={() => router.push("/landlord/requests")} className="flex-1 min-w-[45%]">
                  <StatCard
                    icon={CalendarClock}
                    label="Pending requests"
                    value={String(pendingCount)}
                    highlight={pendingCount > 0}
                  />
                </Pressable>
              </View>
              <Text className="mb-2 text-sm font-semibold text-brand-900 dark:text-white">
                My properties
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <PropertyRow
              property={item}
              canDelete={profile?.role !== "property_manager"}
              onEdit={() => router.push({ pathname: "/landlord/property-form", params: { id: item.id } })}
              onDelete={() => confirmDelete(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={HomeIcon}
              title="No listings yet"
              message="Add your first property to start receiving viewing requests."
              actionLabel="Add a property"
              onAction={() => router.push("/landlord/property-form")}
            />
          }
        />
      )}
    </View>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof HomeIcon;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View
      className={`min-w-[45%] flex-1 rounded-xl p-3 ${
        highlight ? "bg-brand-500" : "bg-muted-light dark:bg-muted-dark"
      }`}
    >
      <Icon size={16} color={highlight ? "#FFFFFF" : "#2C7A4B"} />
      <Text
        className={`mt-2 text-xl font-bold ${highlight ? "text-white" : "text-brand-900 dark:text-white"}`}
      >
        {value}
      </Text>
      <Text className={`text-xs ${highlight ? "text-white/80" : "text-gray-500"}`}>{label}</Text>
    </View>
  );
}

function PropertyRow({
  property,
  canDelete,
  onEdit,
  onDelete,
}: {
  property: LandlordPropertyRow;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View className="mx-4 mb-3 flex-row rounded-xl border border-gray-100 bg-white p-2.5 dark:border-gray-800 dark:bg-muted-dark">
      {property.cover_image_url ? (
        <Image
          source={{ uri: property.cover_image_url }}
          style={{ width: 72, height: 72, borderRadius: 10 }}
          contentFit="cover"
        />
      ) : (
        <View className="h-[72px] w-[72px] items-center justify-center rounded-lg bg-muted-light dark:bg-brand-800">
          <HomeIcon size={22} color="#8A968E" />
        </View>
      )}

      <View className="ml-3 flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 pr-2 text-sm font-semibold text-brand-900 dark:text-white" numberOfLines={1}>
            {property.title}
          </Text>
          <View className={`rounded-full px-2 py-0.5 ${STATUS_STYLES[property.status]?.split(" ")[0]}`}>
            <Text className={`text-[10px] font-medium ${STATUS_STYLES[property.status]?.split(" ").slice(1).join(" ")}`}>
              {property.status}
            </Text>
          </View>
        </View>
        <Text className="mt-0.5 text-xs text-gray-500">{formatPropertyType(property.property_type)}</Text>
        <Text className="mt-0.5 text-sm font-semibold text-brand-700 dark:text-brand-200">
          {formatRentPerMonth(property.rent_amount, property.currency)}
        </Text>

        <View className="mt-2 flex-row items-center gap-4">
          <Text className="text-xs text-gray-500">
            <Eye size={12} color="#8A968E" /> {property.view_count}
          </Text>
          {property.pending_viewing_requests > 0 ? (
            <Text className="text-xs font-medium text-amber-600">
              {property.pending_viewing_requests} pending request
              {property.pending_viewing_requests > 1 ? "s" : ""}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="ml-2 justify-between">
        <Pressable onPress={onEdit} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit listing">
          <Pencil size={18} color="#2C7A4B" />
        </Pressable>
        {canDelete ? (
          <Pressable onPress={onDelete} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete listing">
            <Trash2 size={18} color="#D9463C" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
