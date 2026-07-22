import { supabase } from "./supabase";
import { toFriendlyDatabaseError } from "./errors";
import type { ViewingRequest, ViewingStatus } from "@/types/database";

export class ViewingRequestError extends Error {}

export async function createViewingRequest(params: {
  tenantId: string;
  propertyId: string;
  requestedDate: string; // YYYY-MM-DD
  requestedTime: string; // HH:mm
  notes?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("viewing_requests").insert({
    tenant_id: params.tenantId,
    property_id: params.propertyId,
    requested_date: params.requestedDate,
    requested_time: params.requestedTime,
    notes: params.notes ?? null,
    status: "pending",
  });
  if (error) throw new ViewingRequestError(toFriendlyDatabaseError(error));
}

export interface TenantViewingRequest extends ViewingRequest {
  property_title: string;
  property_cover_image_url: string | null;
}

/** All viewing requests the signed-in tenant has made, newest first. */
export async function getMyViewingRequests(tenantId: string): Promise<TenantViewingRequest[]> {
  const { data, error } = await supabase
    .from("viewing_requests")
    .select("*, properties!inner(title, property_images(secure_url, sort_order))")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new ViewingRequestError(toFriendlyDatabaseError(error));

  return (data ?? []).map((row) => {
    const properties = row.properties as unknown as {
      title: string;
      property_images?: { secure_url: string; sort_order: number }[];
    };
    const images = [...(properties.property_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const { properties: _p, ...rest } = row as typeof row & { properties?: unknown };

    return {
      ...(rest as ViewingRequest),
      property_title: properties?.title ?? "Listing",
      property_cover_image_url: images[0]?.secure_url ?? null,
    };
  });
}

/**
 * Tenant response to a status set by the other side (e.g. accepting or
 * declining a landlord-proposed "rescheduled" date). Reuses the same table —
 * accepting a reschedule just means moving status to "confirmed"; declining
 * means "cancelled". `responderId` is always the tenant here.
 */
export async function respondToViewingRequestAsTenant(
  requestId: string,
  status: ViewingStatus,
  tenantId: string,
): Promise<void> {
  const { error } = await supabase
    .from("viewing_requests")
    .update({ status, responder_id: tenantId })
    .eq("id", requestId);
  if (error) throw new ViewingRequestError(toFriendlyDatabaseError(error));
}

/** Landlord/caretaker proposes a new date/time instead of confirming or declining outright. */
export async function proposeViewingReschedule(params: {
  requestId: string;
  responderId: string;
  requestedDate: string;
  requestedTime: string;
}): Promise<void> {
  const { error } = await supabase
    .from("viewing_requests")
    .update({
      status: "rescheduled",
      responder_id: params.responderId,
      requested_date: params.requestedDate,
      requested_time: params.requestedTime,
    })
    .eq("id", params.requestId);
  if (error) throw new ViewingRequestError(toFriendlyDatabaseError(error));
}
