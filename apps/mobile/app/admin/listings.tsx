import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { AlertTriangle, ArrowLeft, Building2, Eye, Flag, Trash2 } from "lucide-react-native";
import { useAdminDeleteProperty, useAdminProperties, useAdminSetPropertyStatus } from "@/hooks/useAdmin";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Chip } from "@/components/Chip";
import { formatPropertyType, formatRentPerMonth } from "@/lib/format";
import type { AdminPropertyRow } from "@/lib/admin";
import type { PropertyStatus } from "@/types/database";

const STATUS_FILTERS: { label: string; value: PropertyStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Available", value: "available" },
  { label: "Occupied", value: "occupied" },
  { label: "Reserved", value: "reserved" },
  { label: "Removed", value: "removed" },
];

const STATUS_STYLES: Record<string, string> = {
  available: "bg-brand-50 text-brand-700 dark:bg-brand-800 dark:text-brand-200",
  occupied: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  reserved: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  removed: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

export default function AdminListingsScreen() {
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | "all">("all");
  const [search, setSearch] = useState("");
  const { data: properties, isLoading, isError, refetch } = useAdminProperties({
    status: statusFilter,
    search: search.trim() || undefined,
  });
  const setStatus = useAdminSetPropertyStatus();
  const deleteProperty = useAdminDeleteProperty();

  const confirmRemove = (property: AdminPropertyRow) => {
    Alert.alert(
      "Remove listing",
      `Permanently delete "${property.title}"? This can't be undone.`,
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
        <Text className="text-lg font-bold text-brand-900 dark:text-white">Listings</Text>
      </View>

      <View className="px-4 pb-2">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by title"
          placeholderTextColor="#8A968E"
          className="mb-3 rounded-xl border border-gray-200 px-4 py-3 text-brand-900 dark:border-gray-700 dark:text-white"
          accessibilityLabel="Search listings"
        />
        <View className="flex-row flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              selected={statusFilter === f.value}
              onPress={() => setStatusFilter(f.value)}
            />
          ))}
        </View>
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
          contentContainerClassName="px-4 pb-10"
          ListEmptyComponent={
            <EmptyState icon={Building2} title="No listings found" message="Try a different search or filter." />
          }
          renderItem={({ item }) => (
            <ListingRow
              property={item}
              isUpdating={setStatus.isPending || deleteProperty.isPending}
              onView={() => router.push(`/property/${item.id}`)}
              onChangeStatus={(status) => setStatus.mutate({ propertyId: item.id, status })}
              onRemove={() => confirmRemove(item)}
            />
          )}
        />
      )}
    </View>
  );
}

function ListingRow({
  property,
  isUpdating,
  onView,
  onChangeStatus,
  onRemove,
}: {
  property: AdminPropertyRow;
  isUpdating: boolean;
  onView: () => void;
  onChangeStatus: (status: PropertyStatus) => void;
  onRemove: () => void;
}) {
  return (
    <View className="mb-3 flex-row rounded-xl border border-gray-100 p-2.5 dark:border-gray-800">
      {property.cover_image_url ? (
        <Image
          source={{ uri: property.cover_image_url }}
          style={{ width: 64, height: 64, borderRadius: 10 }}
          contentFit="cover"
        />
      ) : (
        <View className="h-16 w-16 items-center justify-center rounded-lg bg-muted-light dark:bg-brand-800">
          <Building2 size={20} color="#8A968E" />
        </View>
      )}

      <View className="ml-3 flex-1">
        <Pressable onPress={onView} accessibilityRole="button" accessibilityLabel={`View ${property.title}`}>
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
          <Text className="mt-0.5 text-xs text-gray-500">
            {formatPropertyType(property.property_type)} · {property.landlord_name ?? "Unknown landlord"}
          </Text>
          <Text className="mt-0.5 text-sm font-semibold text-brand-700 dark:text-brand-200">
            {formatRentPerMonth(property.rent_amount, property.currency)}
          </Text>
        </Pressable>

        <View className="mt-2 flex-row items-center gap-4">
          <View className="flex-row items-center gap-1">
            <Eye size={12} color="#8A968E" />
            <Text className="text-xs text-gray-500">{property.view_count}</Text>
          </View>
          {property.open_report_count > 0 ? (
            <View className="flex-row items-center gap-1">
              <Flag size={12} color="#D9463C" />
              <Text className="text-xs font-medium text-danger">
                {property.open_report_count} open report{property.open_report_count > 1 ? "s" : ""}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mt-2 flex-row flex-wrap gap-1.5">
          {property.status !== "removed" ? (
            <QuickAction
              label="Remove from listings"
              icon={AlertTriangle}
              color="#D9463C"
              disabled={isUpdating}
              onPress={() => onChangeStatus("removed")}
            />
          ) : (
            <QuickAction
              label="Restore"
              icon={Building2}
              color="#2C7A4B"
              disabled={isUpdating}
              onPress={() => onChangeStatus("available")}
            />
          )}
          <QuickAction
            label="Delete permanently"
            icon={Trash2}
            color="#D9463C"
            disabled={isUpdating}
            onPress={onRemove}
          />
        </View>
      </View>
    </View>
  );
}

function QuickAction({
  label,
  icon: Icon,
  color,
  disabled,
  onPress,
}: {
  label: string;
  icon: typeof Trash2;
  color: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-row items-center gap-1 rounded-full bg-muted-light px-2.5 py-1 dark:bg-brand-800"
    >
      <Icon size={11} color={color} />
      <Text className="text-[10px] font-medium" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}
