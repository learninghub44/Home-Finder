import { View } from "react-native";

interface PropertyCardSkeletonProps {
  variant?: "default" | "compact";
}

export function PropertyCardSkeleton({ variant = "default" }: PropertyCardSkeletonProps) {
  const isCompact = variant === "compact";

  return (
    <View
      className={`overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-muted-dark ${
        isCompact ? "w-64" : "w-full"
      }`}
    >
      <View className={`${isCompact ? "h-36" : "h-48"} w-full bg-muted-light dark:bg-brand-800`} />
      <View className="p-3">
        <View className="h-4 w-3/4 rounded bg-muted-light dark:bg-brand-800" />
        <View className="mt-2 h-3 w-1/2 rounded bg-muted-light dark:bg-brand-800" />
        <View className="mt-3 h-4 w-2/5 rounded bg-muted-light dark:bg-brand-800" />
      </View>
    </View>
  );
}

export function PropertyCardSkeletonRow({ count = 3 }: { count?: number }) {
  return (
    <View className="flex-row gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} variant="compact" />
      ))}
    </View>
  );
}
