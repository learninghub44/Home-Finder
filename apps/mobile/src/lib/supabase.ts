import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient, type SupportedStorage } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { env } from "./env";
import type { Database } from "@/types/database";

/**
 * expo-secure-store has a 2KB value size limit per key, which Supabase's
 * session payload can exceed. We chunk large values across multiple keys.
 */
const CHUNK_SIZE = 1800;

const SecureStoreAdapter: SupportedStorage = {
  getItem: async (key: string) => {
    const chunkCountRaw = await SecureStore.getItemAsync(`${key}_chunks`);
    if (!chunkCountRaw) {
      // Fall back to a plain single-key read for small values.
      return SecureStore.getItemAsync(key);
    }
    const chunkCount = parseInt(chunkCountRaw, 10);
    let value = "";
    for (let i = 0; i < chunkCount; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
      if (chunk === null) return null;
      value += chunk;
    }
    return value;
  },
  setItem: async (key: string, value: string) => {
    const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
    if (chunkCount <= 1) {
      await SecureStore.setItemAsync(key, value);
      await SecureStore.deleteItemAsync(`${key}_chunks`);
      return;
    }
    for (let i = 0; i < chunkCount; i++) {
      const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await SecureStore.setItemAsync(`${key}_${i}`, chunk);
    }
    await SecureStore.setItemAsync(`${key}_chunks`, String(chunkCount));
  },
  removeItem: async (key: string) => {
    const chunkCountRaw = await SecureStore.getItemAsync(`${key}_chunks`);
    if (chunkCountRaw) {
      const chunkCount = parseInt(chunkCountRaw, 10);
      for (let i = 0; i < chunkCount; i++) {
        await SecureStore.deleteItemAsync(`${key}_${i}`);
      }
      await SecureStore.deleteItemAsync(`${key}_chunks`);
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient<Database>(
  env.supabaseUrl,
  env.supabaseAnonKey,
  {
    auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Supabase's autoRefreshToken needs an explicit nudge on RN when the app
// foregrounds/backgrounds — otherwise refresh can silently stop while backgrounded.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
