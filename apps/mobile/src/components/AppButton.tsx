import { ActivityIndicator, Pressable, Text } from "react-native";
import * as Haptics from "expo-haptics";

interface AppButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}

export function AppButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  const base =
    "flex-row items-center justify-center rounded-xl py-3.5 px-6 active:opacity-80";
  const variants: Record<typeof variant, string> = {
    primary: "bg-brand-500",
    secondary: "bg-transparent border border-brand-500",
    ghost: "bg-transparent",
  };
  const textVariants: Record<typeof variant, string> = {
    primary: "text-white",
    secondary: "text-brand-500",
    ghost: "text-brand-500",
  };

  return (
    <Pressable
      onPress={() => {
        if (isDisabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`${base} ${variants[variant]} ${isDisabled ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#FFFFFF" : "#2C7A4B"} />
      ) : (
        <Text className={`text-base font-semibold ${textVariants[variant]}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
