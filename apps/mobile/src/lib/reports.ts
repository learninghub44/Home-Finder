import { supabase } from "./supabase";
import { toFriendlyDatabaseError } from "./errors";

export const REPORT_REASONS = [
  "Misleading listing",
  "Already rented / unavailable",
  "Suspected scam",
  "Inappropriate content",
  "Other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export async function reportProperty(params: {
  reporterId: string;
  propertyId: string;
  reportedUserId?: string | null;
  reason: string;
  details?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("reports").insert({
    reporter_id: params.reporterId,
    property_id: params.propertyId,
    reported_user_id: params.reportedUserId ?? null,
    reason: params.reason,
    details: params.details ?? null,
  });
  if (error) throw new Error(toFriendlyDatabaseError(error));
}
