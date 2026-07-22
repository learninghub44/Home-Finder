import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Redirect, router, type Href } from "expo-router";
import { ArrowLeft, Bell, CalendarClock, Home as HomeIcon, MessageCircle, Search } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/hooks/useNotifications";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { resolveNotificationRoute, type AppNotification } from "@/lib/notifications";
import type { LucideIcon } from "lucide-react-native";

const TYPE_ICONS: Record<AppNotification["type"], LucideIcon> = {
  message: MessageCircle,
  viewing_update: CalendarClock,
  saved_search: Search,
  listing_update: HomeIcon,
  system: Bell,
};

export default function NotificationsScreen() {
  const { profile, session, isInitializing } = useAuth();
  const { data: notifications, isLoading, isError, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  if (isInitializing) return null;
  if (!session) return <Redirect href="/(auth)/login" />;

  const handlePress = (notification: AppNotification) => {
    if (!notification.read_at) markRead.mutate(notification.id);

    const route = resolveNotificationRoute(notification.type, notification.data, profile?.role === "tenant");
    if (route) router.push(route as Href);
  };

  return (
    <View className="flex-1 bg-white dark:bg-surface-dark">
      <View className="flex-row items-center justify-between px-4 pb-3 pt-14">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}>
            <ArrowLeft size={22} color="#0B1F17" />
          </Pressable>
          <Text className="text-lg font-bold text-brand-900 dark:text-white">Notifications</Text>
        </View>
        {notifications && notifications.some((n) => !n.read_at) ? (
          <Pressable onPress={() => markAllRead.mutate()} accessibilityRole="button" accessibilityLabel="Mark all as read">
            <Text className="text-xs font-semibold text-brand-500">Mark all read</Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2C7A4B" />
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={notifications ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pb-10 pt-2"
          ListEmptyComponent={
            <EmptyState icon={Bell} title="No notifications yet" message="Updates about your requests, messages, and saved searches will show up here." />
          }
          renderItem={({ item }) => (
            <NotificationRow notification={item} onPress={() => handlePress(item)} />
          )}
        />
      )}
    </View>
  );
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const Icon = TYPE_ICONS[notification.type] ?? Bell;
  const isUnread = !notification.read_at;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={notification.title}
      className={`mb-2 flex-row items-start rounded-xl p-3 ${
        isUnread ? "bg-brand-50 dark:bg-brand-900" : "bg-muted-light dark:bg-muted-dark"
      }`}
    >
      <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-surface-dark">
        <Icon size={16} color="#2C7A4B" />
      </View>
      <View className="flex-1">
        <Text className={`text-sm text-brand-900 dark:text-white ${isUnread ? "font-bold" : "font-semibold"}`}>
          {notification.title}
        </Text>
        {notification.body ? (
          <Text className="mt-0.5 text-xs text-gray-500" numberOfLines={2}>
            {notification.body}
          </Text>
        ) : null}
        <Text className="mt-1 text-[10px] text-gray-400">
          {new Date(notification.created_at).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
      {isUnread ? <View className="ml-2 mt-1.5 h-2 w-2 rounded-full bg-brand-500" /> : null}
    </Pressable>
  );
}
