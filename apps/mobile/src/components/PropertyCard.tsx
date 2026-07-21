import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Heart, BedDouble, MapPin } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import {
  formatBedsBaths,
  formatDistance,
  formatLocation,
  formatPropertyType,
  formatRentPerMonth,
} from "@/lib/format";
import type { PropertyCard as PropertyCardType } from "@/types/database";

interface PropertyCardProps {
  property: PropertyCardType;
  onPress: () => void;
  onToggleFavorite?: () => void;
  /** Compact variant used in horizontal home-screen carousels. */
  variant?: "default" | "compact";
}

export function PropertyCard({
  property,
  onPress,
  onToggleFavorite,
  variant = "default",
}: PropertyCardProps) {
  const isCompact = variant === "compact";
  const distanceLabel = formatDistance(property.distance_meters);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${property.title}, ${formatRentPerMonth(property.rent_amount, property.currency)}`}
      className={`overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-muted-dark ${
        isCompact ? "w-64" : "w-full"
      }`}
    >
      <View className={isCompact ? "h-36 w-full" : "h-48 w-full"}>
        {property.cover_image_url ? (
          <Image
            source={{ uri: property.cover_image_url }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="h-full w-full items-center justify-center bg-muted-light dark:bg-brand-800">
            <BedDouble size={28} color="#8A968E" />
          </View>
        )}

        {onToggleFavorite ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggleFavorite();
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={property.is_favorited ? "Remove from favorites" : "Save to favorites"}
            className="absolute right-2 top-2 h-9 w-9 items-center justify-center rounded-full bg-black/40"
          >
            <Heart
              size={18}
              color="#FFFFFF"
              fill={property.is_favorited ? "#FFFFFF" : "transparent"}
            />
          </Pressable>
        ) : null}

        <View className="absolute left-2 top-2 rounded-full bg-black/50 px-2.5 py-1">
          <Text className="text-xs font-semibold text-white">
            {formatPropertyType(property.property_type)}
          </Text>
        </View>
      </View>

      <View className="p-3">
        <Text
          numberOfLines={1}
          className="text-base font-semibold text-brand-900 dark:text-white"
        >
          {property.title}
        </Text>

        <View className="mt-1 flex-row items-center">
          <MapPin size={13} color="#8A968E" />
          <Text numberOfLines={1} className="ml-1 flex-1 text-xs text-gray-500">
            {formatLocation(property.town, property.county, property.estate)}
          </Text>
        </View>

        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-sm font-bold text-brand-500">
            {formatRentPerMonth(property.rent_amount, property.currency)}
          </Text>
          <Text className="text-xs text-gray-500">
            {formatBedsBaths(property.bedrooms, property.bathrooms)}
          </Text>
        </View>

        {distanceLabel ? (
          <Text className="mt-1 text-xs text-brand-400">{distanceLabel}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
