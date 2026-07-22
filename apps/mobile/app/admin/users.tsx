import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, Ban, CheckCircle2, ShieldCheck, UserCog, Users } from "lucide-react-native";
import { useAdminUsers, useSetUserRole, useSetUserSuspended } from "@/hooks/useAdmin";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Chip } from "@/components/Chip";
import type { Profile, UserRole } from "@/types/database";

const ROLE_FILTERS: { label: string; value: UserRole | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Tenants", value: "tenant" },
  { label: "Landlords", value: "landlord" },
  { label: "Caretakers", value: "property_manager" },
  { label: "Admins", value: "admin" },
];

const ROLE_LABELS: Record<UserRole, string> = {
  tenant: "Tenant",
  landlord: "Landlord",
  property_manager: "Caretaker",
  admin: "Admin",
};

export default function AdminUsersScreen() {
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [search, setSearch] = useState("");
  const { data: users, isLoading, isError, refetch } = useAdminUsers({
    role: roleFilter,
    search: search.trim() || undefined,
  });
  const setSuspended = useSetUserSuspended();
  const setRole = useSetUserRole();

  const confirmSuspend = (user: Profile) => {
    const willSuspend = !user.is_suspended;
    Alert.alert(
      willSuspend ? "Suspend user" : "Reinstate user",
      willSuspend
        ? `Suspend ${user.full_name ?? "this user"}? They won't be able to sign in.`
        : `Reinstate ${user.full_name ?? "this user"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: willSuspend ? "Suspend" : "Reinstate",
          style: willSuspend ? "destructive" : "default",
          onPress: () => setSuspended.mutate({ profileId: user.id, isSuspended: willSuspend }),
        },
      ],
    );
  };

  const confirmRoleChange = (user: Profile, role: UserRole) => {
    if (role === user.role) return;
    Alert.alert(
      "Change role",
      `Change ${user.full_name ?? "this user"} from ${ROLE_LABELS[user.role]} to ${ROLE_LABELS[role]}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Change", onPress: () => setRole.mutate({ profileId: user.id, role }) },
      ],
    );
  };

  return (
    <View className="flex-1 bg-white dark:bg-surface-dark">
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}>
          <ArrowLeft size={22} color="#0B1F17" />
        </Pressable>
        <Text className="text-lg font-bold text-brand-900 dark:text-white">Users</Text>
      </View>

      <View className="px-4 pb-2">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or phone"
          placeholderTextColor="#8A968E"
          className="mb-3 rounded-xl border border-gray-200 px-4 py-3 text-brand-900 dark:border-gray-700 dark:text-white"
          accessibilityLabel="Search users"
        />
        <View className="flex-row flex-wrap">
          {ROLE_FILTERS.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              selected={roleFilter === f.value}
              onPress={() => setRoleFilter(f.value)}
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
          data={users ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pb-10"
          ListEmptyComponent={<EmptyState icon={Users} title="No users found" message="Try a different search or filter." />}
          renderItem={({ item }) => (
            <UserRow
              user={item}
              isUpdating={setSuspended.isPending || setRole.isPending}
              onToggleSuspend={() => confirmSuspend(item)}
              onChangeRole={(role) => confirmRoleChange(item, role)}
            />
          )}
        />
      )}
    </View>
  );
}

function UserRow({
  user,
  isUpdating,
  onToggleSuspend,
  onChangeRole,
}: {
  user: Profile;
  isUpdating: boolean;
  onToggleSuspend: () => void;
  onChangeRole: (role: UserRole) => void;
}) {
  const [showRolePicker, setShowRolePicker] = useState(false);

  return (
    <View className="mb-3 rounded-xl border border-gray-100 p-3.5 dark:border-gray-800">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-sm font-semibold text-brand-900 dark:text-white" numberOfLines={1}>
            {user.full_name ?? "Unnamed user"}
          </Text>
          <Text className="mt-0.5 text-xs text-gray-500">{user.phone ?? "No phone on file"}</Text>
        </View>
        {user.is_suspended ? (
          <View className="rounded-full bg-red-50 px-2 py-0.5 dark:bg-red-950">
            <Text className="text-[10px] font-medium text-danger">Suspended</Text>
          </View>
        ) : null}
      </View>

      <View className="mt-2 flex-row items-center justify-between">
        <Pressable
          onPress={() => setShowRolePicker((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Change role"
          className="flex-row items-center gap-1 rounded-full bg-muted-light px-2.5 py-1 dark:bg-brand-800"
        >
          <UserCog size={12} color="#2C7A4B" />
          <Text className="text-[10px] font-medium text-brand-700 dark:text-brand-200">
            {ROLE_LABELS[user.role]}
          </Text>
        </Pressable>

        <Pressable
          onPress={onToggleSuspend}
          disabled={isUpdating}
          accessibilityRole="button"
          accessibilityLabel={user.is_suspended ? "Reinstate user" : "Suspend user"}
          className="flex-row items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 dark:border-gray-700"
        >
          {user.is_suspended ? (
            <>
              <CheckCircle2 size={12} color="#2C7A4B" />
              <Text className="text-[10px] font-medium text-brand-700 dark:text-brand-200">Reinstate</Text>
            </>
          ) : (
            <>
              <Ban size={12} color="#D9463C" />
              <Text className="text-[10px] font-medium text-danger">Suspend</Text>
            </>
          )}
        </Pressable>
      </View>

      {showRolePicker ? (
        <View className="mt-2 flex-row flex-wrap gap-2 border-t border-gray-100 pt-2 dark:border-gray-800">
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
            <Pressable
              key={role}
              onPress={() => {
                onChangeRole(role);
                setShowRolePicker(false);
              }}
              disabled={isUpdating}
              className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${
                role === user.role ? "bg-brand-500" : "bg-muted-light dark:bg-brand-800"
              }`}
            >
              {role === user.role ? <ShieldCheck size={11} color="#FFFFFF" /> : null}
              <Text
                className={`text-[10px] font-medium ${
                  role === user.role ? "text-white" : "text-brand-700 dark:text-brand-200"
                }`}
              >
                {ROLE_LABELS[role]}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
