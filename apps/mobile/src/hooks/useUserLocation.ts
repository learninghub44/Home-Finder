import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";

export interface UserCoords {
  latitude: number;
  longitude: number;
}

interface UseUserLocationResult {
  coords: UserCoords | null;
  permissionDenied: boolean;
  isLoading: boolean;
  requestLocation: () => Promise<void>;
}

/**
 * Requests foreground location once on mount (needed for "nearby" home
 * sections, map centering, and distance sort). Never blocks the rest of the
 * app — screens should treat `coords: null` as "no location available yet"
 * and fall back to non-location-dependent content.
 */
export function useUserLocation(): UseUserLocationResult {
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const requestLocation = useCallback(async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        setCoords(null);
        return;
      }
      setPermissionDenied(false);
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      // Fail open — screens fall back to non-location content.
      setCoords(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { coords, permissionDenied, isLoading, requestLocation };
}
