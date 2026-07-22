import { FlatList, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useChat";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PropertyCardSkeleton } from "@/components/PropertyCardSkeleton";
import type { ConversationSummary } from "@/lib/chat";

export default function MessagesScreen() {
  const { profile } = useAuth();
  const { data: conversations, isLoading, isError, refetch } = useConversations();

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8 dark:bg-surface-dark">
        <EmptyState
          icon={MessageCircle}
          title="Sign in to see your messages"
          message="Chat with landlords and caretakers about listings you're interested in."
          actionLabel="Sign in"
          onAction={() => router.push("/(auth)/login")}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-surface-dark">
      <View className="px-4 pb-2 pt-14">
        <Text className="text-2xl font-bold text-brand-900 dark:text-white">Messages</Text>
      </View>

      {isLoading ? (
        <View className="gap-3 px-4 pt-2">
          {[1, 2, 3].map((i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </View>
      ) : isError ? (
        <ErrorState message="Couldn't load your conversations." onRetry={refetch} />
      ) : (
        <FlatList
          data={conversations ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pb-8 pt-2"
          ListEmptyComponent={
            <EmptyState
              icon={MessageCircle}
              title="No conversations yet"
              message="Message a landlord or caretaker from any listing to start a conversation."
            />
          }
          renderItem={({ item }) => (
            <ConversationRow conversation={item} onPress={() => router.push(`/chat/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}

function ConversationRow({
  conversation,
  onPress,
}: {
  conversation: ConversationSummary;
  onPress: () => void;
}) {
  const name = conversation.other_participant.full_name ?? "Home Finder user";
  const preview = conversation.last_message
    ? conversation.last_message.body ?? (conversation.last_message.image_url ? "Sent a photo" : "")
    : "Say hello";
  const hasUnread = conversation.unread_count > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open conversation with ${name}`}
      className="mb-2 flex-row items-center rounded-xl bg-muted-light px-3 py-3 dark:bg-muted-dark"
    >
      {conversation.other_participant.avatar_url ? (
        <Image
          source={{ uri: conversation.other_participant.avatar_url }}
          style={{ width: 48, height: 48, borderRadius: 24 }}
        />
      ) : (
        <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-800">
          <Text className="text-base font-bold text-brand-700 dark:text-brand-200">
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View className="ml-3 flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            className={`flex-1 pr-2 text-sm ${hasUnread ? "font-bold" : "font-semibold"} text-brand-900 dark:text-white`}
            numberOfLines={1}
          >
            {name}
          </Text>
          {hasUnread ? (
            <View className="h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-500 px-1.5">
              <Text className="text-[10px] font-bold text-white">{conversation.unread_count}</Text>
            </View>
          ) : null}
        </View>
        {conversation.property_title ? (
          <Text className="text-xs text-brand-500" numberOfLines={1}>
            {conversation.property_title}
          </Text>
        ) : null}
        <Text
          className={`mt-0.5 text-xs ${hasUnread ? "font-semibold text-brand-900 dark:text-white" : "text-gray-500"}`}
          numberOfLines={1}
        >
          {preview}
        </Text>
      </View>
    </Pressable>
  );
}
