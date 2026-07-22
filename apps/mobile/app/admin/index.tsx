import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ChevronRight,
  ClipboardList,
  Eye,
  Flag,
  Heart,
  MapPin,
  ShieldAlert,
  UserCog,
  Users,
} from "lucide-react-native";
import { usePlatformAnalytics } from "@/hooks/useAdmin";
import { ErrorState } from "@/components/ErrorState";

export default function AdminDashboardScreen() {
  const { data: stats, isLoading, isError, refetch } = usePlatformAnalytics();

  return (
    <ScrollView className="flex-1 bg-white dark:bg-surface-dark" contentContainerClassName="pb-10">
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}>
          <ArrowLeft size={22} color="#0B1F17" />
        </Pressable>
        <Text className="text-lg font-bold text-brand-900 dark:text-white">Admin dashboard</Text>
      </View>

      {isLoading ? (
        <View className="items-center justify-center py-16">
          <ActivityIndicator size="large" color="#2C7A4B" />
        </View>
      ) : isError || !stats ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <View className="px-4">
          <View className="mb-2 flex-row flex-wrap gap-2">
            <StatCard icon={Users} label="Total users" value={stats.total_users} />
            <StatCard icon={Building2} label="Listings" value={stats.total_properties} />
            <StatCard
              icon={Flag}
              label="Open reports"
              value={stats.open_reports}
              highlight={stats.open_reports > 0}
            />
            <StatCard
              icon={ClipboardList}
              label="Pending viewings"
              value={stats.pending_viewing_requests}
            />
          </View>

          <View className="mt-4 rounded-xl border border-gray-100 p-3.5 dark:border-gray-800">
            <Text className="mb-2 text-sm font-semibold text-brand-900 dark:text-white">
              Users by role
            </Text>
            <BreakdownRow label="Tenants" value={stats.total_tenants} />
            <BreakdownRow label="Landlords" value={stats.total_landlords} />
            <BreakdownRow label="Caretakers" value={stats.total_caretakers} />
            <BreakdownRow label="Suspended" value={stats.suspended_users} danger={stats.suspended_users > 0} />
            <BreakdownRow label="New in last 30 days" value={stats.new_users_last_30d} />
          </View>

          <View className="mt-3 rounded-xl border border-gray-100 p-3.5 dark:border-gray-800">
            <Text className="mb-2 text-sm font-semibold text-brand-900 dark:text-white">
              Listings by status
            </Text>
            <BreakdownRow label="Available" value={stats.available_properties} />
            <BreakdownRow label="Occupied" value={stats.occupied_properties} />
            <BreakdownRow label="Reserved" value={stats.reserved_properties} />
            <BreakdownRow label="Removed" value={stats.removed_properties} />
            <BreakdownRow label="New in last 30 days" value={stats.new_properties_last_30d} />
            <BreakdownRow
              label="Total views"
              value={stats.total_views}
              icon={Eye}
            />
            <BreakdownRow label="Total favorites" value={stats.total_favorites} icon={Heart} />
          </View>

          <Text className="mb-2 mt-6 text-sm font-semibold text-brand-900 dark:text-white">
            Manage
          </Text>
          <MenuRow icon={UserCog} label="Users" onPress={() => router.push("/admin/users")} />
          <MenuRow icon={Building2} label="Listings" onPress={() => router.push("/admin/listings")} />
          <MenuRow
            icon={ShieldAlert}
            label="Reports"
            subtitle={stats.open_reports > 0 ? `${stats.open_reports} open` : undefined}
            onPress={() => router.push("/admin/reports")}
          />
          <MenuRow
            icon={MapPin}
            label="Locations & amenities"
            onPress={() => router.push("/admin/locations")}
          />
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <View
      className={`min-w-[45%] flex-1 rounded-xl p-3 ${
        highlight ? "bg-danger" : "bg-muted-light dark:bg-muted-dark"
      }`}
    >
      <Icon size={16} color={highlight ? "#FFFFFF" : "#2C7A4B"} />
      <Text className={`mt-2 text-xl font-bold ${highlight ? "text-white" : "text-brand-900 dark:text-white"}`}>
        {value}
      </Text>
      <Text className={`text-xs ${highlight ? "text-white/80" : "text-gray-500"}`}>{label}</Text>
    </View>
  );
}

function BreakdownRow({
  label,
  value,
  danger,
  icon: Icon,
}: {
  label: string;
  value: number;
  danger?: boolean;
  icon?: typeof AlertTriangle;
}) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <View className="flex-row items-center gap-1.5">
        {Icon ? <Icon size={13} color="#8A968E" /> : null}
        <Text className="text-xs text-gray-500">{label}</Text>
      </View>
      <Text className={`text-xs font-semibold ${danger ? "text-danger" : "text-brand-900 dark:text-white"}`}>
        {value}
      </Text>
    </View>
  );
}

function MenuRow({
  icon: Icon,
  label,
  subtitle,
  onPress,
}: {
  icon: typeof Users;
  label: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="mb-2 flex-row items-center rounded-xl bg-muted-light px-4 py-3.5 dark:bg-muted-dark"
    >
      <Icon size={18} color="#2C7A4B" />
      <View className="ml-3 flex-1">
        <Text className="text-sm font-medium text-brand-900 dark:text-white">{label}</Text>
        {subtitle ? <Text className="text-xs text-amber-600">{subtitle}</Text> : null}
      </View>
      <ChevronRight size={16} color="#8A968E" />
    </Pressable>
  );
}
