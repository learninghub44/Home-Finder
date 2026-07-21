import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { hasCompletedOnboarding } from "@/lib/onboarding";

export default function Index() {
  const { session, isInitializing } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    hasCompletedOnboarding()
      .then((done) => setNeedsOnboarding(!done))
      .catch(() => setNeedsOnboarding(false)) // fail open rather than trap the user
      .finally(() => setOnboardingChecked(true));
  }, []);

  if (isInitializing || !onboardingChecked) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#2C7A4B" />
      </View>
    );
  }

  if (needsOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
