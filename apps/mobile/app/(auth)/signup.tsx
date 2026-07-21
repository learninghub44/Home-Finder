import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { signupSchema, type SignupFormValues } from "@/lib/validation/auth";
import type { UserRole } from "@/types/database";

const ROLE_OPTIONS: { value: Extract<UserRole, "tenant" | "landlord" | "property_manager">; label: string }[] = [
  { value: "tenant", label: "I'm looking for a home" },
  { value: "landlord", label: "I'm a landlord" },
  { value: "property_manager", label: "I'm a property manager / caretaker" },
];

export default function Signup() {
  const { signUp, isSubmitting } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "tenant",
    },
  });

  const selectedRole = watch("role");

  const onSubmit = async (values: SignupFormValues) => {
    setFormError(null);

    if (!isOnline) {
      setFormError("No internet connection. Please check your network and try again.");
      return;
    }

    const result = await signUp(values);
    if (!result.success) {
      setFormError(result.error ?? "Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
    Toast.show({
      type: "success",
      text1: "Check your email",
      text2: "We sent a confirmation link to verify your account.",
    });
  };

  if (submitted) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8 dark:bg-surface-dark">
        <Text className="mb-2 text-center text-2xl font-bold text-brand-900 dark:text-white">
          Check your inbox
        </Text>
        <Text className="mb-8 text-center text-base text-gray-500">
          We've sent a confirmation link to your email. Verify your address, then log in below.
        </Text>
        <AppButton label="Go to login" onPress={() => router.replace("/(auth)/login")} />
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
          Create your account
        </Text>
        <Text className="mb-6 text-base text-gray-500">
          Join Home Finder to browse, save, and list rentals.
        </Text>

        <Text className="mb-2 text-sm font-medium text-brand-900 dark:text-white">
          I am...
        </Text>
        <View className="mb-4 gap-2">
          {ROLE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setValue("role", opt.value, { shouldValidate: true })}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedRole === opt.value }}
              className={`rounded-xl border px-4 py-3 ${
                selectedRole === opt.value
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-800"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedRole === opt.value ? "text-brand-700" : "text-gray-600"
                }`}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Full name"
              placeholder="Jane Wanjiru"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.fullName?.message}
            />
          )}
        />

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
              placeholder="At least 8 characters"
              isPassword
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.password?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Confirm password"
              placeholder="Re-enter your password"
              isPassword
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.confirmPassword?.message}
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
          label="Create account"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
        />

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-gray-500">Already have an account? </Text>
          <Link href="/(auth)/login">
            <Text className="text-sm font-semibold text-brand-500">Log in</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
