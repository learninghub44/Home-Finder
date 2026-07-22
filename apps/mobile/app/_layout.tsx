import "@/theme/global.css";
import { useEffect, useState, useCallback } from "react";
import { Slot, router, type Href } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";
import { resolveNotificationRoute } from "@/lib/notifications";
import { View } from "react-native";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore — happens if already hidden, harmless.
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      gcTime: 1000 * 60 * 60 * 24 * 3, // keep persisted cache around for 3 days
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "home-finder-query-cache",
});

// Only persist data that's genuinely useful to see while offline — favorites and the
// landlord/caretaker dashboard (properties + viewing requests). Search results, property
// details, and anything auth-related stay in-memory only (correctly fresh, never stale-served).
const PERSISTED_QUERY_KEY_PREFIXES = ["favorites", "landlord"];

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setAppReady(true);
    }
  }, [fontsLoaded, fontError]);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: asyncStoragePersister,
          maxAge: 1000 * 60 * 60 * 24 * 3,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              const firstKeySegment = String(query.queryKey[0] ?? "");
              return (
                query.state.status === "success" &&
                PERSISTED_QUERY_KEY_PREFIXES.includes(firstKeySegment)
              );
            },
          },
        }}
      >
        <AuthProvider>
          <View className="flex-1 bg-white dark:bg-surface-dark" onLayout={onLayoutRootView}>
            <OfflineBanner />
            <NotificationTapRouter />
            <Slot />
          </View>
          <Toast />
        </AuthProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}

/** Navigates to the right screen when the user taps a push notification (foreground, background, or cold start). */
function NotificationTapRouter() {
  const { profile } = useAuth();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const type = typeof data?.type === "string" ? data.type : "";
      const route = resolveNotificationRoute(type, data, profile?.role === "tenant");
      if (route) router.push(route as Href);
    });
    return () => subscription.remove();
  }, [profile?.role]);

  return null;
}
