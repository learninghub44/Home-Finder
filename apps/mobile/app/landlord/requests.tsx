import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, CalendarClock, MessageCircle, MessageSquareX } from "lucide-react-native";
import {
  useProposeReschedule,
  useUpdateViewingRequestStatus,
  useViewingRequestsInbox,
} from "@/hooks/useLandlordProperties";
import { useStartConversation } from "@/hooks/useChat";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { AppButton } from "@/components/AppButton";
import { RequestViewingModal } from "@/components/RequestViewingModal";
import type { LandlordViewingRequest } from "@/lib/properties";
import type { ViewingStatus } from "@/types/database";

const STATUS_LABELS: Record<ViewingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  rescheduled: "Waiting on tenant",
};

export default function ViewingRequestsScreen() {
  const { data: requests, isLoading, isError, refetch, isRefetching } = useViewingRequestsInbox();
  const updateStatus = useUpdateViewingRequestStatus();
  const proposeReschedule = useProposeReschedule();
  const startConversation = useStartConversation();
  const [rescheduleTarget, setRescheduleTarget] = useState<LandlordViewingRequest | null>(null);

  return (
    <View className="flex-1 bg-white dark:bg-surface-dark">
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}>
          <ArrowLeft size={22} color="#0B1F17" />
        </Pressable>
        <Text className="text-lg font-bold text-brand-900 dark:text-white">Viewing requests</Text>
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
              icon={MessageSquareX}
              title="No viewing requests yet"
              message="Requests from tenants will show up here as soon as they come in."
            />
          }
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              isUpdating={updateStatus.isPending}
              isMessaging={startConversation.isPending}
              onConfirm={() => updateStatus.mutate({ requestId: item.id, status: "confirmed" })}
              onCancel={() => updateStatus.mutate({ requestId: item.id, status: "cancelled" })}
              onComplete={() => updateStatus.mutate({ requestId: item.id, status: "completed" })}
              onReschedule={() => setRescheduleTarget(item)}
              onMessage={() =>
                startConversation.mutate(
                  { otherProfileId: item.tenant_id, propertyId: item.property_id },
                  { onSuccess: (conversationId) => router.push(`/chat/${conversationId}`) },
                )
              }
            />
          )}
        />
      )}

      <RequestViewingModal
        visible={!!rescheduleTarget}
        title="Propose a new time"
        submitLabel="Send proposal"
        showNotes={false}
        isSubmitting={proposeReschedule.isPending}
        onClose={() => setRescheduleTarget(null)}
        onSubmit={({ requestedDate, requestedTime }) => {
          if (!rescheduleTarget) return;
          proposeReschedule.mutate(
            { requestId: rescheduleTarget.id, requestedDate, requestedTime },
            { onSuccess: () => setRescheduleTarget(null) },
          );
        }}
      />
    </View>
  );
}

function RequestCard({
  request,
  isUpdating,
  isMessaging,
  onConfirm,
  onCancel,
  onComplete,
  onReschedule,
  onMessage,
}: {
  request: LandlordViewingRequest;
  isUpdating: boolean;
  isMessaging: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onComplete: () => void;
  onReschedule: () => void;
  onMessage: () => void;
}) {
  return (
    <View className="mb-3 rounded-xl border border-gray-100 bg-white p-3.5 dark:border-gray-800 dark:bg-muted-dark">
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 pr-2 text-sm font-semibold text-brand-900 dark:text-white" numberOfLines={1}>
          {request.property_title}
        </Text>
        <View className="rounded-full bg-muted-light px-2 py-0.5 dark:bg-brand-800">
          <Text className="text-[10px] font-medium text-brand-700 dark:text-brand-200">
            {STATUS_LABELS[request.status]}
          </Text>
        </View>
      </View>

      <View className="mt-1 flex-row items-center justify-between">
        <Text className="flex-1 pr-2 text-xs text-gray-500">
          {request.tenant_name ?? "A tenant"} · requested {request.requested_date} at{" "}
          {request.requested_time}
        </Text>
        <Pressable
          onPress={onMessage}
          disabled={isMessaging}
          accessibilityRole="button"
          accessibilityLabel={`Message ${request.tenant_name ?? "tenant"}`}
          className="h-8 w-8 items-center justify-center rounded-full border border-brand-500"
        >
          <MessageCircle size={14} color="#2C7A4B" />
        </Pressable>
      </View>

      <View className="mt-1 flex-row items-center gap-1">
        <CalendarClock size={13} color="#8A968E" />
        <Text className="text-xs text-gray-500">
          {request.tenant_phone ?? "No phone on file"}
        </Text>
      </View>

      {request.notes ? (
        <Text className="mt-2 text-xs text-gray-600 dark:text-gray-300">{request.notes}</Text>
      ) : null}

      {request.status === "pending" ? (
        <View className="mt-3 gap-2">
          <View className="flex-row gap-2">
            <View className="flex-1">
              <AppButton label="Decline" variant="secondary" disabled={isUpdating} onPress={onCancel} />
            </View>
            <View className="flex-1">
              <AppButton label="Confirm" disabled={isUpdating} onPress={onConfirm} />
            </View>
          </View>
          <AppButton label="Propose a different time" variant="ghost" disabled={isUpdating} onPress={onReschedule} />
        </View>
      ) : request.status === "confirmed" ? (
        <View className="mt-3">
          <AppButton label="Mark completed" variant="secondary" disabled={isUpdating} onPress={onComplete} />
        </View>
      ) : null}
    </View>
  );
}
