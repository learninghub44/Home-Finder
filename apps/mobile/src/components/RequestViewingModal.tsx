import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { X } from "lucide-react-native";
import { AppButton } from "./AppButton";
import { viewingRequestSchema } from "@/lib/validation/viewingRequest";

interface RequestViewingModalProps {
  visible: boolean;
  title?: string;
  submitLabel?: string;
  showNotes?: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: { requestedDate: string; requestedTime: string; notes?: string }) => void;
}

export function RequestViewingModal({
  visible,
  title = "Request a viewing",
  submitLabel = "Send request",
  showNotes = true,
  isSubmitting,
  onClose,
  onSubmit,
}: RequestViewingModalProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ requested_date?: string; requested_time?: string; notes?: string }>({});

  const reset = () => {
    setDate("");
    setTime("");
    setNotes("");
    setErrors({});
  };

  useEffect(() => {
    if (!visible) reset();
  }, [visible]);

  const handleSubmit = () => {
    const result = viewingRequestSchema.safeParse({
      requested_date: date.trim(),
      requested_time: time.trim(),
      notes: notes.trim() || undefined,
    });

    if (!result.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof typeof errors;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    onSubmit({
      requestedDate: result.data.requested_date,
      requestedTime: result.data.requested_time,
      notes: result.data.notes,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-2xl bg-white p-4 pb-8 dark:bg-surface-dark">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-brand-900 dark:text-white">{title}</Text>
            <Pressable
              onPress={() => {
                reset();
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
            >
              <X size={20} color="#0B1F17" />
            </Pressable>
          </View>

          <Text className="mb-1.5 text-sm font-medium text-brand-900 dark:text-white">Date</Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD, e.g. 2026-08-14"
            placeholderTextColor="#8A968E"
            className={`mb-1 rounded-xl border px-4 py-3 text-brand-900 dark:text-white ${
              errors.requested_date ? "border-danger" : "border-gray-200 dark:border-gray-700"
            }`}
            accessibilityLabel="Requested date"
          />
          {errors.requested_date ? (
            <Text className="mb-2 text-xs text-danger">{errors.requested_date}</Text>
          ) : (
            <View className="mb-2" />
          )}

          <Text className="mb-1.5 text-sm font-medium text-brand-900 dark:text-white">Time</Text>
          <TextInput
            value={time}
            onChangeText={setTime}
            placeholder="24-hour, e.g. 14:30"
            placeholderTextColor="#8A968E"
            className={`mb-1 rounded-xl border px-4 py-3 text-brand-900 dark:text-white ${
              errors.requested_time ? "border-danger" : "border-gray-200 dark:border-gray-700"
            }`}
            accessibilityLabel="Requested time"
          />
          {errors.requested_time ? (
            <Text className="mb-4 text-xs text-danger">{errors.requested_time}</Text>
          ) : (
            <View className="mb-4" />
          )}

          {showNotes ? (
            <>
              <Text className="mb-2 text-sm font-medium text-brand-900 dark:text-white">
                Notes (optional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Anything the landlord should know..."
                placeholderTextColor="#8A968E"
                multiline
                numberOfLines={3}
                className="mb-5 rounded-xl border border-gray-200 px-4 py-3 text-brand-900 dark:border-gray-700 dark:text-white"
                style={{ textAlignVertical: "top", minHeight: 80 }}
              />
            </>
          ) : null}

          <AppButton
            label={submitLabel}
            loading={isSubmitting}
            onPress={() => {
              handleSubmit();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
