import { useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  isPassword?: boolean;
}

export function FormField({
  label,
  error,
  isPassword,
  secureTextEntry,
  ...inputProps
}: FormFieldProps) {
  const [hidden, setHidden] = useState(!!isPassword);

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-brand-900 dark:text-white">
        {label}
      </Text>
      <View
        className={`flex-row items-center rounded-xl border bg-white px-4 dark:bg-muted-dark ${
          error ? "border-danger" : "border-gray-200 dark:border-gray-700"
        }`}
      >
        <TextInput
          className="flex-1 py-3 text-base text-brand-900 dark:text-white"
          placeholderTextColor="#8A968E"
          secureTextEntry={isPassword ? hidden : secureTextEntry}
          autoCapitalize="none"
          accessibilityLabel={label}
          {...inputProps}
        />
        {isPassword && (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
          >
            {hidden ? (
              <EyeOff size={20} color="#8A968E" />
            ) : (
              <Eye size={20} color="#8A968E" />
            )}
          </Pressable>
        )}
      </View>
      {error ? (
        <Text className="mt-1 text-xs text-danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
