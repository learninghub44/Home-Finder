/**
 * Supabase surfaces raw Postgres/GoTrue error strings. This maps the common
 * ones to messages a tenant/landlord would actually understand, and falls
 * back to a safe generic message for anything unrecognized (never leak raw
 * SQL/server errors to the UI).
 */
export function toFriendlyAuthError(error: unknown): string {
  const message = extractMessage(error);
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "That email or password doesn't match our records.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please verify your email address before signing in. Check your inbox for the confirmation link.";
  }
  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (lower.includes("password should be at least")) {
    return "Your password doesn't meet the minimum security requirements.";
  }
  if (lower.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (lower.includes("network request failed") || lower.includes("fetch")) {
    return "No internet connection. Please check your network and try again.";
  }
  if (lower.includes("token has expired") || lower.includes("invalid token")) {
    return "This link has expired. Please request a new one.";
  }

  return "Something went wrong. Please try again.";
}

export function toFriendlyDatabaseError(error: unknown): string {
  const message = extractMessage(error);
  const lower = message.toLowerCase();

  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return "You don't have permission to do that.";
  }
  if (lower.includes("duplicate key")) {
    return "This already exists.";
  }
  if (lower.includes("network request failed") || lower.includes("fetch")) {
    return "No internet connection. Please check your network and try again.";
  }
  if (lower.includes("timeout")) {
    return "The request timed out. Please try again.";
  }

  return "Something went wrong loading this data. Pull down to retry.";
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "";
}
