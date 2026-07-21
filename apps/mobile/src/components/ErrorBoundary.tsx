import { Component, type PropsWithChildren, type ReactNode } from "react";
import { Text, View } from "react-native";
import { AppButton } from "./AppButton";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // In production this should also report to a crash-reporting service
    // (e.g. Sentry) — logging here so it's at least visible in dev.
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render(): ReactNode {
    if (this.state.error) {
      return (
        <View className="flex-1 items-center justify-center bg-white px-8 dark:bg-surface-dark">
          <Text className="mb-2 text-xl font-semibold text-brand-900 dark:text-white">
            Something went wrong
          </Text>
          <Text className="mb-6 text-center text-sm text-gray-500">
            An unexpected error occurred. You can try again, and if this keeps
            happening, please reach out to support.
          </Text>
          <AppButton label="Try again" onPress={this.reset} />
        </View>
      );
    }
    return this.props.children;
  }
}
