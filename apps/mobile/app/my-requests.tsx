import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { ArrowLeft, CalendarClock, CalendarX } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { useMyViewingRequests, useRespondToReschedule } from "@/hooks/useViewingRequests";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { AppButton } from "@/components/AppButton";
import type { TenantViewingRequest } from "@/lib/viewingRequests";
import type { ViewingStatus } from "@/types/database";

const STATUS_LABELS: Record<ViewingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  rescheduled: "New time proposed",
};

const STATUS_COLORS: Record<ViewingStatus, string> = {
  pending: "bg-muted-light dark:bg-brand-800",
  confirmed: "bg-brand-50 dark:bg-brand-800",
  completed: "bg-muted-light dark:bg-brand-800",
  cancelled: "bg-red-50 dark:bg-red-950",
  rescheduled: "bg-warning/15",
};

export default function MyViewingRequestsScreen() {
  const { session, isInitializing } = useAuth();
  const { data: requests, isLoading, isError, refetch, isRefetching } = useMyViewingRequests();
  const respond = useRespondToReschedule();

  if (isInitializing) return null;
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <View className="flex-1 bg-white dark:bg-surface-dark">
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}>
          <ArrowLeft size={22} color="#0B1F17" />
        </Pressable>
        <Text className="text-lg font-bold text-brand-900 dark:text-white">My viewing requests</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2C7A4B" />
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={requests ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          contentContainerClassName="px-4 pb-10 pt-2"
          ListEmptyComponent={
            <EmptyState
              icon={CalendarX}
              title="No viewing requests yet"
              message="Requests you send to landlords and caretakers will show up here."
            />
          }
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              isUpdating={respond.isPending}
              onAcceptReschedule={() => respond.mutate({ requestId: item.id, status: "confirmed" })}
              onDeclineReschedule={() => respond.mutate({ requestId: item.id, status: "cancelled" })}
              onCancel={() => respond.mutate({ requestId: item.id, status: "cancelled" })}
            />
          )}
        />
      )}
    </View>
  );
}

function RequestCard({
  request,
  isUpdating,
  onAcceptReschedule,
  onDeclineReschedule,
  onCancel,
}: {
  request: TenantViewingRequest;
  isUpdating: boolean;
  onAcceptReschedule: () => void;
  onDeclineReschedule: () => void;
  onCancel: () => void;
}) {
  return (
    <View className="mb-3 flex-row rounded-xl border border-gray-100 bg-white p-3.5 dark:border-gray-800 dark:bg-muted-dark">
      {request.property_cover_image_url ? (
        <Image
          source={{ uri: request.property_cover_image_url }}
          style={{ width: 52, height: 52, borderRadius: 10 }}
        />
      ) : (
        <View className="h-[52px] w-[52px] items-center justify-center rounded-[10px] bg-muted-light dark:bg-brand-800">
          <CalendarClock size={20} color="#8A968E" />
        </View>
      )}

      <View className="ml-3 flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 pr-2 text-sm font-semibold text-brand-900 dark:text-white" numberOfLines={1}>
            {request.property_title}
          </Text>
          <View className={`rounded-full px-2 py-0.5 ${STATUS_COLORS[request.status]}`}>
            <Text className="text-[10px] font-medium text-brand-700 dark:text-brand-200">
              {STATUS_LABELS[request.status]}
            </Text>
          </View>
        </View>

        <Text className="mt-1 text-xs text-gray-500">
          {request.requested_date} at {request.requested_time}
        </Text>

        {request.notes ? (
          <Text className="mt-1 text-xs text-gray-600 dark:text-gray-300" numberOfLines={2}>
            {request.notes}
          </Text>
        ) : null}

        {request.status === "rescheduled" ? (
          <View className="mt-3 flex-row gap-2">
            <View className="flex-1">
              <AppButton label="Decline" variant="secondary" disabled={isUpdating} onPress={onDeclineReschedule} />
            </View>
            <View className="flex-1">
              <AppButton label="Accept new time" disabled={isUpdating} onPress={onAcceptReschedule} />
            </View>
          </View>
        ) : request.status === "pending" ? (
          <View className="mt-3">
            <AppButton label="Cancel request" variant="secondary" disabled={isUpdating} onPress={onCancel} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
