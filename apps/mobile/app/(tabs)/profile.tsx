import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ChevronRight, Heart, Shield, User as UserIcon } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { AppButton } from "@/components/AppButton";

const ROLE_LABELS: Record<string, string> = {
  tenant: "Tenant",
  landlord: "Landlord",
  property_manager: "Property Manager / Caretaker",
  admin: "Admin",
};

export default function ProfileScreen() {
  const { profile, session, signOut } = useAuth();

  if (!session || !profile) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8 dark:bg-surface-dark">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-muted-light dark:bg-brand-800">
          <UserIcon size={28} color="#8A968E" />
        </View>
        <Text className="mb-1 text-center text-base font-semibold text-brand-900 dark:text-white">
          You're not signed in
        </Text>
        <Text className="mb-5 text-center text-sm text-gray-500">
          Sign in to manage your profile and listings.
        </Text>
        <AppButton label="Sign in" onPress={() => router.push("/(auth)/login")} />
      </View>
    );
  }

  const confirmSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-surface-dark" contentContainerClassName="pb-8">
      <View className="items-center px-4 pb-6 pt-16">
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={{ width: 84, height: 84, borderRadius: 42 }} />
        ) : (
          <View
            className="items-center justify-center rounded-full bg-brand-100 dark:bg-brand-800"
            style={{ width: 84, height: 84, borderRadius: 42 }}
          >
            <Text className="text-2xl font-bold text-brand-700 dark:text-brand-200">
              {(profile.full_name ?? "?").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text className="mt-3 text-xl font-bold text-brand-900 dark:text-white">
          {profile.full_name ?? "Home Finder user"}
        </Text>
        <View className="mt-1 rounded-full bg-brand-50 px-3 py-1 dark:bg-brand-800">
          <Text className="text-xs font-medium text-brand-700 dark:text-brand-200">
            {ROLE_LABELS[profile.role] ?? profile.role}
          </Text>
        </View>
      </View>

      <View className="px-4">
        <MenuRow icon={Heart} label="My favorites" onPress={() => router.push("/(tabs)/favorites")} />
        {profile.role !== "tenant" ? (
          <MenuRow
            icon={Shield}
            label="Landlord / caretaker dashboard"
            subtitle="Coming soon"
            onPress={() =>
              Alert.alert(
                "Coming soon",
                "The landlord and caretaker dashboard is being built next (Phase 4).",
              )
            }
          />
        ) : null}
      </View>

      <View className="mt-6 px-4">
        <AppButton label="Sign out" variant="secondary" onPress={confirmSignOut} />
      </View>
    </ScrollView>
  );
}

function MenuRow({
  icon: Icon,
  label,
  subtitle,
  onPress,
}: {
  icon: typeof Heart;
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
        {subtitle ? <Text className="text-xs text-gray-500">{subtitle}</Text> : null}
      </View>
      <ChevronRight size={16} color="#8A968E" />
    </Pressable>
  );
}
