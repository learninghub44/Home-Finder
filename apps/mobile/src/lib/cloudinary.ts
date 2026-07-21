import { env } from "./env";

export type CloudinaryResource = "image" | "video";

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  resourceType: CloudinaryResource;
  bytes: number;
}

export class CloudinaryUploadError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "CloudinaryUploadError";
  }
}

interface UploadOptions {
  /** Local file URI from expo-image-picker / expo-camera */
  uri: string;
  /** e.g. "properties/{propertyId}" — keeps media organized and easy to clean up */
  folder: string;
  resourceType: CloudinaryResource;
  /** Called with 0-100 as the upload progresses, if the runtime supports it */
  onProgress?: (percent: number) => void;
}

/**
 * Uploads a single local file to Cloudinary using an unsigned upload preset.
 * The preset must be configured in the Cloudinary dashboard to only allow
 * the folders/formats this app needs — never trust the client to set arbitrary options.
 */
export async function uploadToCloudinary({
  uri,
  folder,
  resourceType,
  onProgress,
}: UploadOptions): Promise<CloudinaryUploadResult> {
  const endpoint = `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/${resourceType}/upload`;

  const filename = uri.split("/").pop() ?? `${Date.now()}`;
  const fileType = resourceType === "image" ? "image/jpeg" : "video/mp4";

  const formData = new FormData();
  // React Native's fetch/FormData accepts this shape for local file uris.
  formData.append("file", {
    uri,
    name: filename,
    type: fileType,
  } as unknown as Blob);
  formData.append("upload_preset", env.cloudinaryUploadPreset);
  formData.append("folder", folder);

  try {
    const response = await uploadWithProgress(
      endpoint,
      formData,
      onProgress,
    );

    if (!response.ok) {
      const errorBody = await safeJson(response);
      throw new CloudinaryUploadError(
        errorBody?.error?.message ??
          `Upload failed with status ${response.status}. Check your Cloudinary upload preset and folder permissions.`,
      );
    }

    const data = await response.json();
    return {
      publicId: data.public_id,
      secureUrl: data.secure_url,
      width: data.width,
      height: data.height,
      format: data.format,
      resourceType,
      bytes: data.bytes,
    };
  } catch (err) {
    if (err instanceof CloudinaryUploadError) throw err;
    throw new CloudinaryUploadError(
      "Could not reach Cloudinary. Check your internet connection and try again.",
      err,
    );
  }
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Wraps XMLHttpRequest instead of fetch when progress reporting is requested,
 * since fetch has no upload-progress event in React Native.
 */
function uploadWithProgress(
  endpoint: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<Response> {
  if (!onProgress) {
    return fetch(endpoint, { method: "POST", body: formData });
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
        }),
      );
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData as unknown as Document);
  });
}

/** Uploads multiple files sequentially, collecting successes and per-file failures. */
export async function uploadManyToCloudinary(
  files: { uri: string; resourceType: CloudinaryResource }[],
  folder: string,
): Promise<{
  succeeded: CloudinaryUploadResult[];
  failed: { uri: string; error: string }[];
}> {
  const succeeded: CloudinaryUploadResult[] = [];
  const failed: { uri: string; error: string }[] = [];

  for (const file of files) {
    try {
      const result = await uploadToCloudinary({
        uri: file.uri,
        folder,
        resourceType: file.resourceType,
      });
      succeeded.push(result);
    } catch (err) {
      failed.push({
        uri: file.uri,
        error: err instanceof Error ? err.message : "Unknown upload error",
      });
    }
  }

  return { succeeded, failed };
}
