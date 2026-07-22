import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, MapPin, Plus, Sparkles, Trash2, X } from "lucide-react-native";
import {
  useAdminAmenities,
  useAdminLocations,
  useCreateAmenity,
  useCreateLocation,
  useDeleteAmenity,
  useDeleteLocation,
} from "@/hooks/useAdmin";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { AppButton } from "@/components/AppButton";
import type { Amenity, LocationRow } from "@/types/database";

type Tab = "locations" | "amenities";

export default function AdminLocationsScreen() {
  const [tab, setTab] = useState<Tab>("locations");

  return (
    <View className="flex-1 bg-white dark:bg-surface-dark">
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}>
          <ArrowLeft size={22} color="#0B1F17" />
        </Pressable>
        <Text className="text-lg font-bold text-brand-900 dark:text-white">Locations & amenities</Text>
      </View>

      <View className="flex-row px-4 pb-3">
        <TabButton label="Locations" active={tab === "locations"} onPress={() => setTab("locations")} />
        <TabButton label="Amenities" active={tab === "amenities"} onPress={() => setTab("amenities")} />
      </View>

      {tab === "locations" ? <LocationsPanel /> : <AmenitiesPanel />}
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`mr-2 rounded-full px-4 py-2 ${active ? "bg-brand-500" : "bg-muted-light dark:bg-muted-dark"}`}
    >
      <Text className={`text-sm font-medium ${active ? "text-white" : "text-brand-900 dark:text-white"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function LocationsPanel() {
  const { data: locations, isLoading, isError, refetch } = useAdminLocations();
  const createLocation = useCreateLocation();
  const deleteLocation = useDeleteLocation();
  const [showForm, setShowForm] = useState(false);
  const [county, setCounty] = useState("");
  const [town, setTown] = useState("");
  const [estate, setEstate] = useState("");

  const resetForm = () => {
    setCounty("");
    setTown("");
    setEstate("");
    setShowForm(false);
  };

  const confirmDelete = (location: LocationRow) => {
    Alert.alert(
      "Remove location",
      `Remove ${[location.estate, location.town, location.county].filter(Boolean).join(", ")}? Listings already using it keep it on record.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => deleteLocation.mutate(location.id) },
      ],
    );
  };

  return (
    <View className="flex-1">
      <View className="px-4">
        {showForm ? (
          <View className="mb-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-brand-900 dark:text-white">Add location</Text>
              <Pressable onPress={resetForm} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
                <X size={18} color="#0B1F17" />
              </Pressable>
            </View>
            <TextInput
              value={county}
              onChangeText={setCounty}
              placeholder="County (e.g. Nairobi)"
              placeholderTextColor="#8A968E"
              className="mb-2 rounded-xl border border-gray-200 px-4 py-3 text-brand-900 dark:border-gray-700 dark:text-white"
            />
            <TextInput
              value={town}
              onChangeText={setTown}
              placeholder="Town (e.g. Westlands)"
              placeholderTextColor="#8A968E"
              className="mb-2 rounded-xl border border-gray-200 px-4 py-3 text-brand-900 dark:border-gray-700 dark:text-white"
            />
            <TextInput
              value={estate}
              onChangeText={setEstate}
              placeholder="Estate (optional)"
              placeholderTextColor="#8A968E"
              className="mb-3 rounded-xl border border-gray-200 px-4 py-3 text-brand-900 dark:border-gray-700 dark:text-white"
            />
            <AppButton
              label="Save location"
              loading={createLocation.isPending}
              onPress={() => {
                if (!county.trim() || !town.trim()) return;
                createLocation.mutate(
                  { county: county.trim(), town: town.trim(), estate: estate.trim() || null },
                  { onSuccess: resetForm },
                );
              }}
            />
          </View>
        ) : (
          <Pressable
            onPress={() => setShowForm(true)}
            accessibilityRole="button"
            accessibilityLabel="Add location"
            className="mb-3 flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-500 py-3"
          >
            <Plus size={16} color="#2C7A4B" />
            <Text className="text-sm font-medium text-brand-500">Add location</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2C7A4B" />
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={locations ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pb-10"
          ListEmptyComponent={<EmptyState icon={MapPin} title="No locations yet" message="Add one above." />}
          renderItem={({ item }) => (
            <View className="mb-2 flex-row items-center justify-between rounded-xl border border-gray-100 px-3.5 py-3 dark:border-gray-800">
              <View className="flex-1 pr-2">
                <Text className="text-sm font-medium text-brand-900 dark:text-white">{item.town}</Text>
                <Text className="text-xs text-gray-500">
                  {[item.estate, item.county].filter(Boolean).join(", ")}
                </Text>
              </View>
              <Pressable
                onPress={() => confirmDelete(item)}
                disabled={deleteLocation.isPending}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.town}`}
                hitSlop={8}
              >
                <Trash2 size={16} color="#D9463C" />
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

function AmenitiesPanel() {
  const { data: amenities, isLoading, isError, refetch } = useAdminAmenities();
  const createAmenity = useCreateAmenity();
  const deleteAmenity = useDeleteAmenity();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");

  const confirmDelete = (amenity: Amenity) => {
    Alert.alert(
      "Remove amenity",
      `Remove "${amenity.name}"? Listings already using it keep it on record.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => deleteAmenity.mutate(amenity.id) },
      ],
    );
  };

  return (
    <View className="flex-1">
      <View className="px-4">
        {showForm ? (
          <View className="mb-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-brand-900 dark:text-white">Add amenity</Text>
              <Pressable
                onPress={() => {
                  setName("");
                  setShowForm(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
              >
                <X size={18} color="#0B1F17" />
              </Pressable>
            </View>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Amenity name (e.g. Backup generator)"
              placeholderTextColor="#8A968E"
              className="mb-3 rounded-xl border border-gray-200 px-4 py-3 text-brand-900 dark:border-gray-700 dark:text-white"
            />
            <AppButton
              label="Save amenity"
              loading={createAmenity.isPending}
              onPress={() => {
                if (!name.trim()) return;
                createAmenity.mutate(
                  { name: name.trim() },
                  {
                    onSuccess: () => {
                      setName("");
                      setShowForm(false);
                    },
                  },
                );
              }}
            />
          </View>
        ) : (
          <Pressable
            onPress={() => setShowForm(true)}
            accessibilityRole="button"
            accessibilityLabel="Add amenity"
            className="mb-3 flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-500 py-3"
          >
            <Plus size={16} color="#2C7A4B" />
            <Text className="text-sm font-medium text-brand-500">Add amenity</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2C7A4B" />
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={amenities ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pb-10"
          ListEmptyComponent={<EmptyState icon={Sparkles} title="No amenities yet" message="Add one above." />}
          renderItem={({ item }) => (
            <View className="mb-2 flex-row items-center justify-between rounded-xl border border-gray-100 px-3.5 py-3 dark:border-gray-800">
              <Text className="text-sm font-medium text-brand-900 dark:text-white">{item.name}</Text>
              <Pressable
                onPress={() => confirmDelete(item)}
                disabled={deleteAmenity.isPending}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.name}`}
                hitSlop={8}
              >
                <Trash2 size={16} color="#D9463C" />
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}
