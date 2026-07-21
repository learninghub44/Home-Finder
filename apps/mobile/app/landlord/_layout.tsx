import { Redirect, Slot } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/hooks/useAuth";

/**
 * Guards the entire /landlord route group: only landlords, property
 * managers (caretakers), and admins may enter. Tenants and signed-out
 * users are bounced back to the tabs / login respectively.
 */
export default function LandlordLayout() {
  const { session, profile, isInitializing } = useAuth();

  if (isInitializing) return null;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (profile && !["landlord", "property_manager", "admin"].includes(profile.role)) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View className="flex-1 bg-white dark:bg-surface-dark">
      <Slot />
    </View>
  );
}
