import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Toast from "react-native-toast-message";
import { FormField } from "@/components/FormField";
import { AppButton } from "@/components/AppButton";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { loginSchema, type LoginFormValues } from "@/lib/validation/auth";

export default function Login() {
  const { signIn, isSubmitting } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);

    if (!isOnline) {
      setFormError("No internet connection. Please check your network and try again.");
      return;
    }

    const result = await signIn(values);
    if (!result.success) {
      setFormError(result.error ?? "Something went wrong. Please try again.");
      return;
    }
    Toast.show({ type: "success", text1: "Welcome back!" });
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-white dark:bg-surface-dark"
    >
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-10">
        <Text className="mb-1 text-3xl font-bold text-brand-900 dark:text-white">
          Welcome back
        </Text>
        <Text className="mb-8 text-base text-gray-500">
          Sign in to keep browsing and manage your saved homes.
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

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Password"
              placeholder="Enter your password"
              isPassword
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.password?.message}
            />
          )}
        />

        <Link href="/(auth)/forgot-password" asChild>
          <Text className="mb-6 text-right text-sm font-medium text-brand-500">
            Forgot password?
          </Text>
        </Link>

        {formError ? (
          <View
            className="mb-4 rounded-xl bg-red-50 p-3 dark:bg-red-950"
            accessibilityRole="alert"
          >
            <Text className="text-sm text-danger">{formError}</Text>
          </View>
        ) : null}

        <AppButton label="Log in" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-gray-500">Don't have an account? </Text>
          <Link href="/(auth)/signup">
            <Text className="text-sm font-semibold text-brand-500">Sign up</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
