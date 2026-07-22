import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import {
  createViewingRequest,
  getMyViewingRequests,
  respondToViewingRequestAsTenant,
} from "@/lib/viewingRequests";
import { useAuth } from "./useAuth";
import type { ViewingStatus } from "@/types/database";

const tenantRequestsKey = (tenantId: string) => ["viewing-requests", "mine", tenantId] as const;

export function useMyViewingRequests() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: tenantRequestsKey(profile?.id ?? ""),
    queryFn: () => getMyViewingRequests(profile?.id as string),
    enabled: !!profile?.id,
  });
}

export function useCreateViewingRequest() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { propertyId: string; requestedDate: string; requestedTime: string; notes?: string }) => {
      if (!profile?.id) throw new Error("Sign in to request a viewing.");
      await createViewingRequest({
        tenantId: profile.id,
        propertyId: params.propertyId,
        requestedDate: params.requestedDate,
        requestedTime: params.requestedTime,
        notes: params.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["viewing-requests", "mine"] });
      Toast.show({
        type: "success",
        text1: "Viewing requested",
        text2: "The landlord will confirm your requested date and time.",
      });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't request a viewing",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}

/** Tenant accepting or declining a landlord/caretaker-proposed reschedule. */
export function useRespondToReschedule() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: ViewingStatus }) => {
      if (!profile?.id) throw new Error("Sign in to respond to this request.");
      await respondToViewingRequestAsTenant(requestId, status, profile.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["viewing-requests", "mine"] });
      Toast.show({ type: "success", text1: "Response sent" });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't send your response",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}
