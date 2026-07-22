import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import { useAuth } from "./useAuth";

const notificationsKey = {
  list: (profileId: string) => ["notifications", "list", profileId] as const,
  unreadCount: (profileId: string) => ["notifications", "unread-count", profileId] as const,
};

export function useNotifications() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: notificationsKey.list(profile?.id ?? ""),
    queryFn: () => getMyNotifications(profile?.id as string),
    enabled: !!profile?.id,
  });
}

export function useUnreadNotificationCount() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: notificationsKey.unreadCount(profile?.id ?? ""),
    queryFn: () => getUnreadNotificationCount(profile?.id as string),
    enabled: !!profile?.id,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      if (!profile?.id) return;
      queryClient.invalidateQueries({ queryKey: notificationsKey.list(profile.id) });
      queryClient.invalidateQueries({ queryKey: notificationsKey.unreadCount(profile.id) });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("Sign in first.");
      await markAllNotificationsRead(profile.id);
    },
    onSuccess: () => {
      if (!profile?.id) return;
      queryClient.invalidateQueries({ queryKey: notificationsKey.list(profile.id) });
      queryClient.invalidateQueries({ queryKey: notificationsKey.unreadCount(profile.id) });
    },
  });
}
