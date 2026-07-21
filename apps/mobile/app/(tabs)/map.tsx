import { useCallback, useMemo, useRef, useState } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from "react-native-maps";
import { router } from "expo-router";
import { Locate, Search } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useSearchProperties, useToggleFavorite } from "@/hooks/useProperties";
import { PropertyCard } from "@/components/PropertyCard";
import { ErrorState } from "@/components/ErrorState";
import { formatRentPerMonth } from "@/lib/format";
import type { PropertyCard as PropertyCardType } from "@/types/database";

// Nairobi, Kenya — sensible default center when we have no user location yet.
const DEFAULT_REGION: Region = {
  latitude: -1.2921,
  longitude: 36.8219,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

interface Cluster {
  key: string;
  latitude: number;
  longitude: number;
  properties: PropertyCardType[];
}

/** Lightweight grid-based clustering: groups markers that fall within the same
 * cell of a grid sized relative to the current zoom level. Avoids pulling in
 * an extra native clustering dependency for what is, at this data scale, a
 * simple bucketing problem. */
function clusterProperties(properties: PropertyCardType[], region: Region): Cluster[] {
  const cellSize = Math.max(region.longitudeDelta / 12, 0.002);
  const buckets = new Map<string, PropertyCardType[]>();

  for (const property of properties) {
    if (property.latitude == null || property.longitude == null) continue;
    const cellX = Math.round(property.longitude / cellSize);
    const cellY = Math.round(property.latitude / cellSize);
    const key = `${cellX}:${cellY}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(property);
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries()).map(([key, props]) => ({
    key,
    latitude: props.reduce((sum, p) => sum + (p.latitude ?? 0), 0) / props.length,
    longitude: props.reduce((sum, p) => sum + (p.longitude ?? 0), 0) / props.length,
    properties: props,
  }));
}

export default function MapScreen() {
  const { profile } = useAuth();
  const { coords } = useUserLocation();
  const toggleFavorite = useToggleFavorite();
  const mapRef = useRef<MapView>(null);

  const [region, setRegion] = useState<Region>(
    coords ? { ...DEFAULT_REGION, latitude: coords.latitude, longitude: coords.longitude } : DEFAULT_REGION,
  );
  const [selected, setSelected] = useState<PropertyCardType | null>(null);

  const { data, isLoading, isError, refetch } = useSearchProperties(
    {
      sort_by: coords ? "nearest" : "newest",
      user_lat: coords?.latitude,
      user_lng: coords?.longitude,
      radius_meters: coords ? 100000 : null,
      page_limit: 200,
    },
    true,
  );

  const properties = useMemo(
    () => (data ?? []).filter((p) => p.latitude != null && p.longitude != null),
    [data],
  );
  const clusters = useMemo(() => clusterProperties(properties, region), [properties, region]);

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

  const recenter = useCallback(() => {
    if (!coords) return;
    mapRef.current?.animateToRegion(
      { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      400,
    );
  }, [coords]);

  if (isError) {
    return (
      <View className="flex-1 bg-white pt-14 dark:bg-surface-dark">
        <ErrorState message="Couldn't load listings for the map." onRetry={refetch} />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ width: Dimensions.get("window").width, height: "100%" }}
        initialRegion={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={!!coords}
        showsMyLocationButton={false}
      >
        {clusters.map((cluster) =>
          cluster.properties.length === 1 ? (
            <Marker
              key={cluster.key}
              coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
              onPress={() => setSelected(cluster.properties[0])}
              accessibilityLabel={`${cluster.properties[0].title}, ${formatRentPerMonth(
                cluster.properties[0].rent_amount,
                cluster.properties[0].currency,
              )}`}
            >
              <View className="rounded-full border border-brand-500 bg-white px-2.5 py-1.5 shadow-sm">
                <Text className="text-xs font-bold text-brand-700">
                  {formatRentPerMonth(cluster.properties[0].rent_amount, cluster.properties[0].currency)}
                </Text>
              </View>
            </Marker>
          ) : (
            <Marker
              key={cluster.key}
              coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
              onPress={() => {
                mapRef.current?.animateToRegion(
                  {
                    latitude: cluster.latitude,
                    longitude: cluster.longitude,
                    latitudeDelta: region.latitudeDelta / 3,
                    longitudeDelta: region.longitudeDelta / 3,
                  },
                  350,
                );
              }}
              accessibilityLabel={`${cluster.properties.length} listings in this area`}
            >
              <View className="h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand-500 shadow-sm">
                <Text className="text-xs font-bold text-white">{cluster.properties.length}</Text>
              </View>
            </Marker>
          ),
        )}
      </MapView>

      {/* Search bar overlay */}
      <Pressable
        onPress={() => router.push("/search")}
        accessibilityRole="button"
        accessibilityLabel="Search listings"
        className="absolute left-4 right-4 top-14 flex-row items-center rounded-xl bg-white px-4 py-3.5 shadow-md dark:bg-muted-dark"
      >
        <Search size={18} color="#8A968E" />
        <Text className="ml-3 flex-1 text-sm text-gray-500">Search by location, price, type...</Text>
      </Pressable>

      {coords ? (
        <Pressable
          onPress={recenter}
          accessibilityRole="button"
          accessibilityLabel="Center on my location"
          className="absolute bottom-6 right-4 h-11 w-11 items-center justify-center rounded-full bg-white shadow-md dark:bg-muted-dark"
        >
          <Locate size={20} color="#2C7A4B" />
        </Pressable>
      ) : null}

      {isLoading ? (
        <View className="absolute bottom-6 left-4 rounded-full bg-black/60 px-3 py-1.5">
          <Text className="text-xs text-white">Loading listings…</Text>
        </View>
      ) : null}

      {/* Selected property preview */}
      {selected ? (
        <View className="absolute bottom-6 left-4 right-4">
          <PropertyCard
            property={selected}
            onPress={() => openProperty(selected.id)}
            onToggleFavorite={() => handleToggleFavorite(selected)}
          />
        </View>
      ) : null}
    </View>
  );
}
