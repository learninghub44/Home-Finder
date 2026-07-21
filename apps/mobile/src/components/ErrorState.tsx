import { Text, View } from "react-native";
import { CloudAlert } from "lucide-react-native";
import { AppButton } from "./AppButton";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Something went wrong loading this. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16" accessibilityRole="alert">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
        <CloudAlert size={28} color="#D9463C" />
      </View>
      <Text className="text-center text-base font-semibold text-brand-900 dark:text-white">
        Couldn't load this
      </Text>
      <Text className="mt-1 text-center text-sm text-gray-500">{message}</Text>
      {onRetry ? (
        <View className="mt-5 w-full max-w-xs">
          <AppButton label="Try again" onPress={onRetry} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}
