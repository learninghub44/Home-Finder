import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests notification permission (if not already granted) and returns the
 * device's Expo push token, or null if unavailable (simulator, permission
 * denied, or no EAS project configured yet).
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push tokens aren't issued to simulators/emulators.
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2C7A4B",
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn(
      "No EAS projectId configured (app.json extra.eas.projectId) — run `eas init` first. Skipping push registration.",
    );
    return null;
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (err) {
    console.warn("Failed to get Expo push token:", err);
    return null;
  }
}

/** Upserts the device's push token for the signed-in profile. Safe to call repeatedly. */
export async function registerPushToken(profileId: string): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;

  const { error } = await supabase.from("push_tokens").upsert(
    {
      profile_id: profileId,
      expo_push_token: token,
      device_info: `${Device.modelName ?? "unknown"} / ${Platform.OS} ${Platform.Version}`,
    },
    { onConflict: "profile_id,expo_push_token" },
  );
  if (error) console.warn("Failed to save push token:", error.message);
}

/** Removes this device's push token, e.g. on sign-out. */
export async function unregisterPushToken(profileId: string): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;
  await supabase
    .from("push_tokens")
    .delete()
    .eq("profile_id", profileId)
    .eq("expo_push_token", token);
}
