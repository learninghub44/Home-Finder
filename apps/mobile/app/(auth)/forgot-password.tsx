import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/FormField";
import { AppButton } from "@/components/AppButton";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/validation/auth";

export default function ForgotPassword() {
  const { resetPassword, isSubmitting } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setFormError(null);
    if (!isOnline) {
      setFormError("No internet connection. Please check your network and try again.");
      return;
    }
    const result = await resetPassword(values.email);
    if (!result.success) {
      setFormError(result.error ?? "Something went wrong. Please try again.");
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8 dark:bg-surface-dark">
        <Text className="mb-2 text-center text-2xl font-bold text-brand-900 dark:text-white">
          Check your email
        </Text>
        <Text className="mb-8 text-center text-base text-gray-500">
          If an account exists for that email, we've sent a link to reset your password.
        </Text>
        <AppButton label="Back to login" onPress={() => router.replace("/(auth)/login")} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-white dark:bg-surface-dark"
    >
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-10">
        <Text className="mb-1 text-3xl font-bold text-brand-900 dark:text-white">
          Reset your password
        </Text>
        <Text className="mb-8 text-base text-gray-500">
          Enter the email on your account and we'll send you a reset link.
        </Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.email?.message}
            />
          )}
        />

        {formError ? (
          <View
            className="mb-4 rounded-xl bg-red-50 p-3 dark:bg-red-950"
            accessibilityRole="alert"
          >
            <Text className="text-sm text-danger">{formError}</Text>
          </View>
        ) : null}

        <AppButton
          label="Send reset link"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
        />

        <View className="mt-6 items-center">
          <Link href="/(auth)/login">
            <Text className="text-sm font-semibold text-brand-500">Back to login</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
