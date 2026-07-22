import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import {
  getMessages,
  getMyConversations,
  getOrCreateConversation,
  markConversationRead,
  sendMessage,
  subscribeToConversation,
} from "@/lib/chat";
import { useAuth } from "./useAuth";
import type { Message } from "@/types/database";

const chatKey = {
  conversations: () => ["chat", "conversations"] as const,
  messages: (conversationId: string) => ["chat", "messages", conversationId] as const,
};

export function useConversations() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: chatKey.conversations(),
    queryFn: getMyConversations,
    enabled: !!profile?.id,
    refetchInterval: 30_000,
  });
}

/** Finds or creates a conversation and returns its id, ready to navigate to `/chat/[id]`. */
export function useStartConversation() {
  return useMutation({
    mutationFn: ({ otherProfileId, propertyId }: { otherProfileId: string; propertyId?: string | null }) =>
      getOrCreateConversation(otherProfileId, propertyId),
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't start conversation",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}

/**
 * Message thread for a conversation: loads history, subscribes to new
 * messages over Supabase Realtime for the lifetime of the screen, and marks
 * incoming messages read once they're fetched.
 */
export function useMessages(conversationId: string | undefined) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: chatKey.messages(conversationId ?? ""),
    queryFn: () => getMessages(conversationId as string),
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = subscribeToConversation(conversationId, (message) => {
      queryClient.setQueryData<Message[]>(chatKey.messages(conversationId), (prev) =>
        prev ? [...prev, message] : [message],
      );
      queryClient.invalidateQueries({ queryKey: chatKey.conversations() });
    });
    return unsubscribe;
  }, [conversationId, queryClient]);

  useEffect(() => {
    if (!conversationId || !profile?.id || !query.data || query.data.length === 0) return;
    const hasUnread = query.data.some((m) => m.sender_id !== profile.id && !m.read_at);
    if (hasUnread) {
      markConversationRead(conversationId, profile.id).then(() => {
        queryClient.invalidateQueries({ queryKey: chatKey.conversations() });
      });
    }
    // Only re-run when the message list identity changes (new fetch or realtime append).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, profile?.id, query.data]);

  return query;
}

export function useSendMessage(conversationId: string | undefined) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ body, imageUrl }: { body?: string; imageUrl?: string }) => {
      if (!profile?.id) throw new Error("Sign in to send messages.");
      if (!conversationId) throw new Error("Conversation not found.");
      await sendMessage({ conversationId, senderId: profile.id, body, imageUrl });
    },
    onSuccess: () => {
      // The realtime subscription appends the sender's own message too, so no
      // optimistic insert here — just refresh the conversation list preview.
      queryClient.invalidateQueries({ queryKey: chatKey.conversations() });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Message not sent",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}
