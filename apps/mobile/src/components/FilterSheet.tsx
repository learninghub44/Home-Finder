import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { X } from "lucide-react-native";
import { Chip } from "./Chip";
import { AppButton } from "./AppButton";
import { useAmenities, useCounties, useTownsForCounty } from "@/hooks/useProperties";
import { formatPropertyType } from "@/lib/format";
import type { PropertyType } from "@/types/database";

const PROPERTY_TYPES: PropertyType[] = [
  "bedsitter",
  "one_bedroom",
  "two_bedroom",
  "three_bedroom",
  "apartment",
  "bungalow",
  "maisonette",
  "townhouse",
  "studio",
  "other",
];

const BEDROOM_OPTIONS = [0, 1, 2, 3, 4, 5];

export interface FilterState {
  minRent: string;
  maxRent: string;
  bedrooms: number | null;
  propertyTypes: PropertyType[];
  amenityIds: string[];
  county: string | null;
  town: string | null;
}

export const EMPTY_FILTERS: FilterState = {
  minRent: "",
  maxRent: "",
  bedrooms: null,
  propertyTypes: [],
  amenityIds: [],
  county: null,
  town: null,
};

interface FilterSheetProps {
  visible: boolean;
  initialFilters: FilterState;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
}

export function FilterSheet({ visible, initialFilters, onClose, onApply }: FilterSheetProps) {
  const [draft, setDraft] = useState<FilterState>(initialFilters);
  const { data: amenities } = useAmenities();
  const { data: counties } = useCounties();
  const { data: towns } = useTownsForCounty(draft.county);

  useEffect(() => {
    if (visible) setDraft(initialFilters);
  }, [visible, initialFilters]);

  const togglePropertyType = (type: PropertyType) => {
    setDraft((prev) => ({
      ...prev,
      propertyTypes: prev.propertyTypes.includes(type)
        ? prev.propertyTypes.filter((t) => t !== type)
        : [...prev.propertyTypes, type],
    }));
  };

  const toggleAmenity = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      amenityIds: prev.amenityIds.includes(id)
        ? prev.amenityIds.filter((a) => a !== id)
        : [...prev.amenityIds, id],
    }));
  };

  const activeCount =
    (draft.minRent ? 1 : 0) +
    (draft.maxRent ? 1 : 0) +
    (draft.bedrooms !== null ? 1 : 0) +
    draft.propertyTypes.length +
    draft.amenityIds.length +
    (draft.county ? 1 : 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-white dark:bg-surface-dark">
        <View className="flex-row items-center justify-between border-b border-gray-100 px-4 pb-3 pt-14 dark:border-gray-800">
          <Text className="text-lg font-bold text-brand-900 dark:text-white">Filters</Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close filters"
            hitSlop={10}
          >
            <X size={22} color="#0B1F17" />
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8">
          {/* Price range */}
          <Text className="mb-2 mt-5 text-sm font-semibold text-brand-900 dark:text-white">
            Price range (KES/mo)
          </Text>
          <View className="flex-row gap-3">
            <TextInput
              value={draft.minRent}
              onChangeText={(v) => setDraft((p) => ({ ...p, minRent: v.replace(/[^0-9]/g, "") }))}
              placeholder="Min"
              keyboardType="number-pad"
              placeholderTextColor="#8A968E"
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-brand-900 dark:border-gray-700 dark:text-white"
            />
            <TextInput
              value={draft.maxRent}
              onChangeText={(v) => setDraft((p) => ({ ...p, maxRent: v.replace(/[^0-9]/g, "") }))}
              placeholder="Max"
              keyboardType="number-pad"
              placeholderTextColor="#8A968E"
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-brand-900 dark:border-gray-700 dark:text-white"
            />
          </View>

          {/* Bedrooms */}
          <Text className="mb-2 mt-6 text-sm font-semibold text-brand-900 dark:text-white">
            Bedrooms
          </Text>
          <View className="flex-row flex-wrap">
            {BEDROOM_OPTIONS.map((n) => (
              <Chip
                key={n}
                label={n === 0 ? "Studio" : `${n}${n === 5 ? "+" : ""}`}
                selected={draft.bedrooms === n}
                onPress={() =>
                  setDraft((p) => ({ ...p, bedrooms: p.bedrooms === n ? null : n }))
                }
              />
            ))}
          </View>

          {/* Property type */}
          <Text className="mb-2 mt-6 text-sm font-semibold text-brand-900 dark:text-white">
            Property type
          </Text>
          <View className="flex-row flex-wrap">
            {PROPERTY_TYPES.map((type) => (
              <Chip
                key={type}
                label={formatPropertyType(type)}
                selected={draft.propertyTypes.includes(type)}
                onPress={() => togglePropertyType(type)}
              />
            ))}
          </View>

          {/* Amenities */}
          <Text className="mb-2 mt-6 text-sm font-semibold text-brand-900 dark:text-white">
            Amenities
          </Text>
          <View className="flex-row flex-wrap">
            {(amenities ?? []).map((a) => (
              <Chip
                key={a.id}
                label={a.name}
                selected={draft.amenityIds.includes(a.id)}
                onPress={() => toggleAmenity(a.id)}
              />
            ))}
          </View>

          {/* Location */}
          <Text className="mb-2 mt-6 text-sm font-semibold text-brand-900 dark:text-white">
            County
          </Text>
          <View className="flex-row flex-wrap">
            {(counties ?? []).map((c) => (
              <Chip
                key={c}
                label={c}
                selected={draft.county === c}
                onPress={() =>
                  setDraft((p) => ({
                    ...p,
                    county: p.county === c ? null : c,
                    town: p.county === c ? null : p.town,
                  }))
                }
              />
            ))}
          </View>

          {draft.county ? (
            <>
              <Text className="mb-2 mt-6 text-sm font-semibold text-brand-900 dark:text-white">
                Town
              </Text>
              <View className="flex-row flex-wrap">
                {(towns ?? []).map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    selected={draft.town === t}
                    onPress={() => setDraft((p) => ({ ...p, town: p.town === t ? null : t }))}
                  />
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>

        <View className="flex-row gap-3 border-t border-gray-100 px-4 py-4 dark:border-gray-800">
          <View className="flex-1">
            <AppButton
              label={`Reset${activeCount ? ` (${activeCount})` : ""}`}
              variant="secondary"
              onPress={() => setDraft(EMPTY_FILTERS)}
            />
          </View>
          <View className="flex-1">
            <AppButton label="Show results" onPress={() => onApply(draft)} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
