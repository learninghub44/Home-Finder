import { Pressable, Text } from "react-native";
import * as Haptics from "expo-haptics";

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`mb-2 mr-2 rounded-full border px-4 py-2 ${
        selected
          ? "border-brand-500 bg-brand-500"
          : "border-gray-200 bg-white dark:border-gray-700 dark:bg-muted-dark"
      }`}
    >
      <Text
        className={`text-sm font-medium ${
          selected ? "text-white" : "text-brand-900 dark:text-white"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
