import { supabase } from "./supabase";
import { toFriendlyDatabaseError } from "./errors";
import type { Message } from "@/types/database";

export class ChatError extends Error {}

export interface ConversationSummary {
  id: string;
  property_id: string | null;
  property_title: string | null;
  other_participant: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  last_message: {
    body: string | null;
    image_url: string | null;
    created_at: string;
    sender_id: string;
  } | null;
  unread_count: number;
  created_at: string;
}

/** Finds (or creates) the 1:1 conversation with `otherProfileId`, optionally scoped to a listing. */
export async function getOrCreateConversation(
  otherProfileId: string,
  propertyId?: string | null,
): Promise<string> {
  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    other_profile_id: otherProfileId,
    for_property_id: propertyId ?? null,
  });
  if (error) throw new ChatError(toFriendlyDatabaseError(error));
  return data as string;
}

export async function getMyConversations(): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc("get_my_conversations");
  if (error) throw new ChatError(toFriendlyDatabaseError(error));
  return (data ?? []) as ConversationSummary[];
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw new ChatError(toFriendlyDatabaseError(error));
  return data ?? [];
}

export async function sendMessage(params: {
  conversationId: string;
  senderId: string;
  body?: string | null;
  imageUrl?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("messages").insert({
    conversation_id: params.conversationId,
    sender_id: params.senderId,
    body: params.body ?? null,
    image_url: params.imageUrl ?? null,
  });
  if (error) throw new ChatError(toFriendlyDatabaseError(error));
}

/** Marks every unread message *from the other participant* in this conversation as read. */
export async function markConversationRead(conversationId: string, myProfileId: string): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", myProfileId)
    .is("read_at", null);
  if (error) throw new ChatError(toFriendlyDatabaseError(error));
}

/** Subscribes to new messages in a conversation via Supabase Realtime. Returns an unsubscribe function. */
export function subscribeToConversation(
  conversationId: string,
  onInsert: (message: Message) => void,
): () => void {
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onInsert(payload.new as Message),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
