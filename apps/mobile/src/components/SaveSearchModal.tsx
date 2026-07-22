import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { X } from "lucide-react-native";
import { AppButton } from "./AppButton";

interface SaveSearchModalProps {
  visible: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export function SaveSearchModal({ visible, isSubmitting, onClose, onSubmit }: SaveSearchModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setName("");
      setError(null);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-2xl bg-white p-4 pb-8 dark:bg-surface-dark">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-brand-900 dark:text-white">Save this search</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
              <X size={20} color="#0B1F17" />
            </Pressable>
          </View>

          <Text className="mb-1.5 text-sm font-medium text-brand-900 dark:text-white">Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Kilimani bedsitters under 20k"
            placeholderTextColor="#8A968E"
            className={`mb-1 rounded-xl border px-4 py-3 text-brand-900 dark:text-white ${
              error ? "border-danger" : "border-gray-200 dark:border-gray-700"
            }`}
            accessibilityLabel="Saved search name"
          />
          {error ? <Text className="mb-2 text-xs text-danger">{error}</Text> : <View className="mb-2" />}

          <Text className="mb-4 text-xs text-gray-500">
            We'll notify you when a new listing matches your filters.
          </Text>

          <AppButton
            label="Save search"
            loading={isSubmitting}
            onPress={() => {
              const trimmed = name.trim();
              if (!trimmed) {
                setError("Give this search a name");
                return;
              }
              onSubmit(trimmed);
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
