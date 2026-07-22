import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, ShieldAlert } from "lucide-react-native";
import { useAdminReports, useUpdateReportStatus } from "@/hooks/useAdmin";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Chip } from "@/components/Chip";
import type { AdminReportRow } from "@/lib/admin";
import type { ReportStatus } from "@/types/database";

const STATUS_FILTERS: { label: string; value: ReportStatus | "all" }[] = [
  { label: "Open", value: "open" },
  { label: "Reviewing", value: "reviewing" },
  { label: "Resolved", value: "resolved" },
  { label: "Dismissed", value: "dismissed" },
  { label: "All", value: "all" },
];

const STATUS_STYLES: Record<ReportStatus, string> = {
  open: "bg-red-50 text-danger dark:bg-red-950",
  reviewing: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  resolved: "bg-brand-50 text-brand-700 dark:bg-brand-800 dark:text-brand-200",
  dismissed: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

export default function AdminReportsScreen() {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("open");
  const { data: reports, isLoading, isError, refetch } = useAdminReports(statusFilter);
  const updateStatus = useUpdateReportStatus();

  return (
    <View className="flex-1 bg-white dark:bg-surface-dark">
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}>
          <ArrowLeft size={22} color="#0B1F17" />
        </Pressable>
        <Text className="text-lg font-bold text-brand-900 dark:text-white">Reports</Text>
      </View>

      <View className="px-4 pb-2">
        <View className="flex-row flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              selected={statusFilter === f.value}
              onPress={() => setStatusFilter(f.value)}
            />
          ))}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2C7A4B" />
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={reports ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pb-10"
          ListEmptyComponent={
            <EmptyState icon={ShieldAlert} title="No reports here" message="Nothing matches this filter right now." />
          }
          renderItem={({ item }) => (
            <ReportRow
              report={item}
              isUpdating={updateStatus.isPending}
              onView={() => item.property_id && router.push(`/property/${item.property_id}`)}
              onSetStatus={(status) => updateStatus.mutate({ reportId: item.id, status })}
            />
          )}
        />
      )}
    </View>
  );
}

function ReportRow({
  report,
  isUpdating,
  onView,
  onSetStatus,
}: {
  report: AdminReportRow;
  isUpdating: boolean;
  onView: () => void;
  onSetStatus: (status: ReportStatus) => void;
}) {
  return (
    <View className="mb-3 rounded-xl border border-gray-100 p-3.5 dark:border-gray-800">
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 pr-2 text-sm font-semibold text-brand-900 dark:text-white" numberOfLines={1}>
          {report.reason}
        </Text>
        <View className={`rounded-full px-2 py-0.5 ${STATUS_STYLES[report.status].split(" ")[0]}`}>
          <Text className={`text-[10px] font-medium ${STATUS_STYLES[report.status].split(" ").slice(1).join(" ")}`}>
            {report.status}
          </Text>
        </View>
      </View>

      <Text className="mt-1 text-xs text-gray-500">
        Reported by {report.reporter_name ?? "a user"}
        {report.reported_user_name ? ` about ${report.reported_user_name}` : ""}
      </Text>

      {report.property_title ? (
        <Pressable onPress={onView} accessibilityRole="button" accessibilityLabel={`View ${report.property_title}`}>
          <Text className="mt-1 text-xs font-medium text-brand-700 underline dark:text-brand-200">
            Listing: {report.property_title}
          </Text>
        </Pressable>
      ) : null}

      {report.details ? (
        <Text className="mt-2 text-xs text-gray-600 dark:text-gray-300">{report.details}</Text>
      ) : null}

      {report.status !== "resolved" && report.status !== "dismissed" ? (
        <View className="mt-3 flex-row gap-2">
          {report.status === "open" ? (
            <ActionChip
              label="Start reviewing"
              disabled={isUpdating}
              onPress={() => onSetStatus("reviewing")}
            />
          ) : null}
          <ActionChip label="Resolve" disabled={isUpdating} onPress={() => onSetStatus("resolved")} />
          <ActionChip label="Dismiss" disabled={isUpdating} onPress={() => onSetStatus("dismissed")} />
        </View>
      ) : null}
    </View>
  );
}

function ActionChip({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="rounded-full bg-muted-light px-3 py-1.5 dark:bg-brand-800"
    >
      <Text className="text-xs font-medium text-brand-700 dark:text-brand-200">{label}</Text>
    </Pressable>
  );
}
