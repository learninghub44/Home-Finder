import { Text, View } from "react-native";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  if (isOnline) return null;

  return (
    <View className="bg-warning px-4 py-2">
      <Text className="text-center text-xs font-medium text-brand-900">
        You're offline. Some features may not work until you reconnect.
      </Text>
    </View>
  );
}
