import { supabase } from "./supabase";
import { toFriendlyDatabaseError } from "./errors";
import type { AppNotification } from "@/types/database";

export class NotificationError extends Error {}

export type { AppNotification };

export async function getMyNotifications(profileId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new NotificationError(toFriendlyDatabaseError(error));
  return (data ?? []) as AppNotification[];
}

export async function getUnreadNotificationCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .is("read_at", null);
  if (error) throw new NotificationError(toFriendlyDatabaseError(error));
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new NotificationError(toFriendlyDatabaseError(error));
}

export async function markAllNotificationsRead(profileId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .is("read_at", null);
  if (error) throw new NotificationError(toFriendlyDatabaseError(error));
}

/** Resolves the in-app route a notification (or a raw push payload) should open, or null. */
export function resolveNotificationRoute(
  type: string,
  data: Record<string, unknown> | undefined,
  tenantRole: boolean,
): string | null {
  switch (type) {
    case "message":
      return data?.conversation_id ? `/chat/${String(data.conversation_id)}` : null;
    case "viewing_update":
      return tenantRole ? "/my-requests" : "/landlord/requests";
    case "saved_search":
    case "listing_update":
      return data?.property_id ? `/property/${String(data.property_id)}` : null;
    default:
      return null;
  }
}
