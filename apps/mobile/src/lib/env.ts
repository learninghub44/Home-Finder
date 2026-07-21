/**
 * Centralized, validated access to EXPO_PUBLIC_* env vars.
 * Throws at startup if required config is missing, instead of failing
 * mysteriously deep inside a network call later.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env and fill in real values.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required(
    "EXPO_PUBLIC_SUPABASE_URL",
    process.env.EXPO_PUBLIC_SUPABASE_URL,
  ),
  supabaseAnonKey: required(
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
  cloudinaryCloudName: required(
    "EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME",
    process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
  ),
  cloudinaryUploadPreset: required(
    "EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET",
    process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  ),
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
};
