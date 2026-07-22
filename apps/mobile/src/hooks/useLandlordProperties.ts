import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import {
  addPropertyImages,
  createProperty,
  deleteProperty,
  deletePropertyImage,
  getMyCaretakers,
  getMyProperties,
  getPropertyForEdit,
  getPropertyImages,
  getViewingRequestsForLandlord,
  getViewsOverTime,
  reorderPropertyImages,
  updateProperty,
  updateViewingRequestStatus,
  type PropertyFormInput,
} from "@/lib/properties";
import { proposeViewingReschedule } from "@/lib/viewingRequests";
import { useAuth } from "./useAuth";
import type { ViewingStatus } from "@/types/database";

const landlordKey = {
  myProperties: (profileId: string) => ["landlord", "properties", profileId] as const,
  propertyEdit: (propertyId: string) => ["landlord", "property", propertyId] as const,
  propertyImages: (propertyId: string) => ["landlord", "property-images", propertyId] as const,
  viewingRequests: (profileId: string) => ["landlord", "viewing-requests", profileId] as const,
  caretakers: (profileId: string) => ["landlord", "caretakers", profileId] as const,
  viewsOverTime: (profileId: string, daysBack: number) =>
    ["landlord", "views-over-time", profileId, daysBack] as const,
};

/** Day-bucketed views over the last `daysBack` days, for the dashboard chart. */
export function useViewsOverTime(daysBack = 30) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: landlordKey.viewsOverTime(profile?.id ?? "", daysBack),
    queryFn: () => getViewsOverTime(profile?.id as string, daysBack),
    enabled: !!profile?.id,
  });
}

/** Caretakers this landlord has on file, for the "assign caretaker" picker. */
export function useMyCaretakers() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: landlordKey.caretakers(profile?.id ?? ""),
    queryFn: () => getMyCaretakers(profile?.id as string),
    enabled: !!profile?.id,
  });
}

export function useMyProperties() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: landlordKey.myProperties(profile?.id ?? ""),
    queryFn: () => getMyProperties(profile?.id as string),
    enabled: !!profile?.id,
  });
}

export function usePropertyForEdit(propertyId: string | undefined) {
  return useQuery({
    queryKey: landlordKey.propertyEdit(propertyId ?? ""),
    queryFn: () => getPropertyForEdit(propertyId as string),
    enabled: !!propertyId,
  });
}

export function usePropertyImagesForEdit(propertyId: string | undefined) {
  return useQuery({
    queryKey: landlordKey.propertyImages(propertyId ?? ""),
    queryFn: () => getPropertyImages(propertyId as string),
    enabled: !!propertyId,
  });
}

/** Creates a new listing, then attaches any uploaded Cloudinary images to it. */
export function useCreateProperty() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      input,
      images,
    }: {
      input: PropertyFormInput;
      images: { cloudinary_public_id: string; secure_url: string; width: number; height: number }[];
    }) => {
      if (!profile?.id) throw new Error("Sign in to add a listing.");
      const propertyId = await createProperty(profile.id, input);
      if (images.length > 0) {
        await addPropertyImages(
          propertyId,
          images.map((img, i) => ({ ...img, sort_order: i })),
        );
      }
      return propertyId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord", "properties"] });
      Toast.show({ type: "success", text1: "Listing created" });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't create listing",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      propertyId,
      patch,
      newImages,
    }: {
      propertyId: string;
      patch: Partial<PropertyFormInput>;
      newImages?: { cloudinary_public_id: string; secure_url: string; width: number; height: number }[];
    }) => {
      await updateProperty(propertyId, patch);
      if (newImages && newImages.length > 0) {
        const existing = await getPropertyImages(propertyId);
        await addPropertyImages(
          propertyId,
          newImages.map((img, i) => ({ ...img, sort_order: existing.length + i })),
        );
      }
    },
    onSuccess: (_data, { propertyId }) => {
      queryClient.invalidateQueries({ queryKey: ["landlord", "properties"] });
      queryClient.invalidateQueries({ queryKey: landlordKey.propertyEdit(propertyId) });
      queryClient.invalidateQueries({ queryKey: landlordKey.propertyImages(propertyId) });
      queryClient.invalidateQueries({ queryKey: ["properties", "details"] });
      Toast.show({ type: "success", text1: "Listing updated" });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't update listing",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}

export function useDeletePropertyImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ imageId }: { imageId: string; propertyId: string }) =>
      deletePropertyImage(imageId),
    onSuccess: (_data, { propertyId }) => {
      queryClient.invalidateQueries({ queryKey: landlordKey.propertyImages(propertyId) });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't remove photo",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}

/** Persists a new photo order — index 0 becomes the cover photo. */
export function useReorderPropertyImages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, orderedImageIds }: { propertyId: string; orderedImageIds: string[] }) =>
      reorderPropertyImages(propertyId, orderedImageIds),
    onSuccess: (_data, { propertyId }) => {
      queryClient.invalidateQueries({ queryKey: landlordKey.propertyImages(propertyId) });
      queryClient.invalidateQueries({ queryKey: ["landlord", "properties"] });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't reorder photos",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}

/** Quick status change (e.g. "mark occupied") without opening the full edit form. */
export function useUpdatePropertyStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, status }: { propertyId: string; status: PropertyFormInput["status"] }) =>
      updateProperty(propertyId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord", "properties"] });
      queryClient.invalidateQueries({ queryKey: ["properties", "details"] });
      Toast.show({ type: "success", text1: "Status updated" });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't update status",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (propertyId: string) => deleteProperty(propertyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord", "properties"] });
      Toast.show({ type: "success", text1: "Listing deleted" });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't delete listing",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}

export function useViewingRequestsInbox() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: landlordKey.viewingRequests(profile?.id ?? ""),
    queryFn: () => getViewingRequestsForLandlord(profile?.id as string),
    enabled: !!profile?.id,
  });
}

export function useUpdateViewingRequestStatus() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: ViewingStatus }) => {
      if (!profile?.id) throw new Error("Sign in to respond to viewing requests.");
      await updateViewingRequestStatus(requestId, status, profile.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord", "viewing-requests"] });
      queryClient.invalidateQueries({ queryKey: ["landlord", "properties"] });
      Toast.show({ type: "success", text1: "Request updated" });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't update request",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}

/** Landlord/caretaker proposes a different date/time instead of confirming or declining. */
export function useProposeReschedule() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      requestedDate,
      requestedTime,
    }: {
      requestId: string;
      requestedDate: string;
      requestedTime: string;
    }) => {
      if (!profile?.id) throw new Error("Sign in to respond to viewing requests.");
      await proposeViewingReschedule({
        requestId,
        responderId: profile.id,
        requestedDate,
        requestedTime,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord", "viewing-requests"] });
      Toast.show({ type: "success", text1: "New time proposed", text2: "The tenant will be notified." });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't propose a new time",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}
