import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Send } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { useConversations, useMessages, useSendMessage } from "@/hooks/useChat";
import { ErrorState } from "@/components/ErrorState";
import type { Message } from "@/types/database";

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, session, isInitializing } = useAuth();
  const { data: messages, isLoading, isError, refetch } = useMessages(id);
  const { data: conversations } = useConversations();
  const sendMessage = useSendMessage(id);
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<Message>>(null);

  if (isInitializing) return null;
  if (!session) return <Redirect href="/(auth)/login" />;

  const other = useMemo(
    () => conversations?.find((c) => c.id === id)?.other_participant,
    [conversations, id],
  );

  const handleSend = () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    sendMessage.mutate({ body });
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-surface-dark"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View className="flex-row items-center gap-3 border-b border-gray-100 px-4 pb-3 pt-14 dark:border-gray-800">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}>
          <ArrowLeft size={22} color="#0B1F17" />
        </Pressable>
        {other?.avatar_url ? (
          <Image source={{ uri: other.avatar_url }} style={{ width: 34, height: 34, borderRadius: 17 }} />
        ) : (
          <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-brand-100 dark:bg-brand-800">
            <Text className="text-sm font-bold text-brand-700 dark:text-brand-200">
              {(other?.full_name ?? "?").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text className="text-base font-bold text-brand-900 dark:text-white" numberOfLines={1}>
          {other?.full_name ?? "Conversation"}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2C7A4B" />
        </View>
      ) : isError ? (
        <ErrorState message="Couldn't load this conversation." onRetry={refetch} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 py-3"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => <MessageBubble message={item} isMine={item.sender_id === profile?.id} />}
        />
      )}

      <View className="flex-row items-end gap-2 border-t border-gray-100 px-3 py-3 dark:border-gray-800">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message..."
          placeholderTextColor="#8A968E"
          multiline
          className="max-h-28 flex-1 rounded-2xl border border-gray-200 px-4 py-2.5 text-brand-900 dark:border-gray-700 dark:text-white"
          style={{ textAlignVertical: "top" }}
          accessibilityLabel="Message"
        />
        <Pressable
          onPress={handleSend}
          disabled={!draft.trim() || sendMessage.isPending}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          className={`h-11 w-11 items-center justify-center rounded-full bg-brand-500 ${
            !draft.trim() || sendMessage.isPending ? "opacity-50" : ""
          }`}
        >
          <Send size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message, isMine }: { message: Message; isMine: boolean }) {
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <View className={`mb-2 max-w-[80%] ${isMine ? "self-end" : "self-start"}`}>
      <View
        className={`rounded-2xl px-4 py-2.5 ${
          isMine ? "rounded-br-md bg-brand-500" : "rounded-bl-md bg-muted-light dark:bg-muted-dark"
        }`}
      >
        {message.image_url ? (
          <Image source={{ uri: message.image_url }} style={{ width: 200, height: 150, borderRadius: 12 }} />
        ) : null}
        {message.body ? (
          <Text className={isMine ? "text-white" : "text-brand-900 dark:text-white"}>{message.body}</Text>
        ) : null}
      </View>
      <Text className={`mt-1 text-[10px] text-gray-400 ${isMine ? "text-right" : "text-left"}`}>{time}</Text>
    </View>
  );
}
