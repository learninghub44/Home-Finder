import { Redirect, Slot } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/hooks/useAuth";

/**
 * Guards the entire /admin route group: admin role only. Everyone else is
 * bounced back to the tabs / login, same pattern as /landlord's guard.
 */
export default function AdminLayout() {
  const { session, profile, isInitializing } = useAuth();

  if (isInitializing) return null;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (profile && profile.role !== "admin") {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View className="flex-1 bg-white dark:bg-surface-dark">
      <Slot />
    </View>
  );
}
