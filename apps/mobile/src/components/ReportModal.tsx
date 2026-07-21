import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { X } from "lucide-react-native";
import { Chip } from "./Chip";
import { AppButton } from "./AppButton";
import { REPORT_REASONS } from "@/lib/reports";

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => void;
  isSubmitting?: boolean;
}

export function ReportModal({ visible, onClose, onSubmit, isSubmitting }: ReportModalProps) {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-2xl bg-white p-4 pb-8 dark:bg-surface-dark">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-brand-900 dark:text-white">Report this listing</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
              <X size={20} color="#0B1F17" />
            </Pressable>
          </View>

          <Text className="mb-2 text-sm font-medium text-brand-900 dark:text-white">Reason</Text>
          <View className="mb-4 flex-row flex-wrap">
            {REPORT_REASONS.map((r) => (
              <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
            ))}
          </View>

          <Text className="mb-2 text-sm font-medium text-brand-900 dark:text-white">
            Additional details (optional)
          </Text>
          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Tell us more..."
            placeholderTextColor="#8A968E"
            multiline
            numberOfLines={3}
            className="mb-5 rounded-xl border border-gray-200 px-4 py-3 text-brand-900 dark:border-gray-700 dark:text-white"
            style={{ textAlignVertical: "top", minHeight: 80 }}
          />

          <AppButton
            label="Submit report"
            loading={isSubmitting}
            onPress={() => {
              onSubmit(reason, details.trim());
              setDetails("");
              setReason(REPORT_REASONS[0]);
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
