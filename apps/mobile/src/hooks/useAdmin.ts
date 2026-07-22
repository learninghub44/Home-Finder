import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import {
  adminDeleteProperty,
  adminSetPropertyStatus,
  createAmenity,
  createLocation,
  deleteAmenity,
  deleteLocation,
  getAllAmenityRows,
  getAllLocationRows,
  getAllPropertiesForAdmin,
  getPlatformAnalytics,
  getReports,
  getUsers,
  setUserRole,
  setUserSuspended,
  updateReportStatus,
  type AdminPropertyFilters,
  type AdminUserFilters,
} from "@/lib/admin";
import type { PropertyStatus, ReportStatus, UserRole } from "@/types/database";

const adminKey = {
  analytics: ["admin", "analytics"] as const,
  users: (filters: AdminUserFilters) => ["admin", "users", filters] as const,
  properties: (filters: AdminPropertyFilters) => ["admin", "properties", filters] as const,
  reports: (status: ReportStatus | "all") => ["admin", "reports", status] as const,
  locations: ["admin", "locations"] as const,
  amenities: ["admin", "amenities"] as const,
};

export function usePlatformAnalytics() {
  return useQuery({
    queryKey: adminKey.analytics,
    queryFn: getPlatformAnalytics,
  });
}

export function useAdminUsers(filters: AdminUserFilters) {
  return useQuery({
    queryKey: adminKey.users(filters),
    queryFn: () => getUsers(filters),
  });
}

export function useSetUserSuspended() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, isSuspended }: { profileId: string; isSuspended: boolean }) =>
      setUserSuspended(profileId, isSuspended),
    onSuccess: (_data, { isSuspended }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      Toast.show({ type: "success", text1: isSuspended ? "User suspended" : "User reinstated" });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't update user",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}

export function useSetUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, role }: { profileId: string; role: UserRole }) =>
      setUserRole(profileId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      Toast.show({ type: "success", text1: "Role updated" });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't update role",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}

export function useAdminProperties(filters: AdminPropertyFilters) {
  return useQuery({
    queryKey: adminKey.properties(filters),
    queryFn: () => getAllPropertiesForAdmin(filters),
  });
}

export function useAdminSetPropertyStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, status }: { propertyId: string; status: PropertyStatus }) =>
      adminSetPropertyStatus(propertyId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "properties"] });
      queryClient.invalidateQueries({ queryKey: ["properties", "details"] });
      Toast.show({ type: "success", text1: "Listing status updated" });
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

export function useAdminDeleteProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (propertyId: string) => adminDeleteProperty(propertyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "properties"] });
      Toast.show({ type: "success", text1: "Listing removed" });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't remove listing",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}

export function useAdminReports(status: ReportStatus | "all") {
  return useQuery({
    queryKey: adminKey.reports(status),
    queryFn: () => getReports(status),
  });
}

export function useUpdateReportStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, status }: { reportId: string; status: ReportStatus }) =>
      updateReportStatus(reportId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      queryClient.invalidateQueries({ queryKey: adminKey.analytics });
      Toast.show({ type: "success", text1: "Report updated" });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't update report",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}

export function useAdminLocations() {
  return useQuery({
    queryKey: adminKey.locations,
    queryFn: getAllLocationRows,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKey.locations });
      Toast.show({ type: "success", text1: "Location added" });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't add location",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (locationId: string) => deleteLocation(locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKey.locations });
      Toast.show({ type: "success", text1: "Location removed" });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't remove location",
        text2: err instanceof Error ? err.message : "It may still be in use by a listing.",
      });
    },
  });
}

export function useAdminAmenities() {
  return useQuery({
    queryKey: adminKey.amenities,
    queryFn: getAllAmenityRows,
  });
}

export function useCreateAmenity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAmenity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKey.amenities });
      Toast.show({ type: "success", text1: "Amenity added" });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't add amenity",
        text2: err instanceof Error ? err.message : undefined,
      });
    },
  });
}

export function useDeleteAmenity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amenityId: string) => deleteAmenity(amenityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKey.amenities });
      Toast.show({ type: "success", text1: "Amenity removed" });
    },
    onError: (err) => {
      Toast.show({
        type: "error",
        text1: "Couldn't remove amenity",
        text2: err instanceof Error ? err.message : "It may still be in use by a listing.",
      });
    },
  });
}
