import { Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { SearchX } from "lucide-react-native";
import { AppButton } from "./AppButton";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon = SearchX,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-muted-light dark:bg-brand-800">
        <Icon size={28} color="#8A968E" />
      </View>
      <Text className="text-center text-base font-semibold text-brand-900 dark:text-white">
        {title}
      </Text>
      {message ? (
        <Text className="mt-1 text-center text-sm text-gray-500">{message}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <View className="mt-5 w-full max-w-xs">
          <AppButton label={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}
