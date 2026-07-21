import { useMutation } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { reportProperty } from "@/lib/reports";
import { useAuth } from "./useAuth";

export function useReportProperty() {
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      propertyId: string;
      reportedUserId?: string | null;
      reason: string;
      details?: string | null;
    }) => {
      if (!profile?.id) throw new Error("Sign in to report a listing.");
      await reportProperty({ reporterId: profile.id, ...params });
    },
    onSuccess: () => {
      Toast.show({
        type: "success",
        text1: "Report submitted",
        text2: "Thanks — our team will review this listing.",
      });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't submit report",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}
