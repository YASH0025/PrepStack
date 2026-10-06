import "server-only";

import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

import { env } from "@/lib/env";

export type UploadKind = "avatar" | "attachment";

export interface StoredFile {
  /** Opaque key; only the storage service knows how to turn it into a URL. */
  storageKey: string;
  bytes: number;
  mimeType: string;
}

export interface UploadInput {
  data: Buffer;
  fileName: string;
  mimeType: string;
  kind: UploadKind;
  /** Owner user id; files are grouped per user so account deletion can remove them. */
  ownerId: string;
}

/**
 * File storage behind an interface (Cloudinary now, S3 later).
 * Attachments are private: they are only reachable through short-lived signed URLs.
 */
export interface StorageService {
  readonly enabled: boolean;
  upload(input: UploadInput): Promise<StoredFile>;
  /** Short-lived URL for downloading a private file. */
  getDownloadUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;
  delete(storageKey: string): Promise<void>;
  deleteAllForOwner(ownerId: string): Promise<void>;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_UPLOAD_TYPES: Record<UploadKind, readonly string[]> = {
  avatar: ["image/png", "image/jpeg", "image/webp"],
  attachment: [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "text/plain",
    "text/markdown",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

export class UploadsDisabledError extends Error {
  constructor() {
    super("File uploads are not configured on this server");
    this.name = "UploadsDisabledError";
  }
}

/** Validates type and size before anything leaves the server. Returns an error message or null. */
export function validateUpload(
  input: Pick<UploadInput, "data" | "mimeType" | "kind">,
): string | null {
  if (!ALLOWED_UPLOAD_TYPES[input.kind].includes(input.mimeType)) {
    return "This file type is not allowed";
  }
  if (input.data.length === 0) return "The file is empty";
  if (input.data.length > MAX_UPLOAD_BYTES) return "Files must be 10 MB or smaller";
  return null;
}

/*
 * storageKey format: "<resourceType>|<deliveryType>|<publicId>|<format>".
 * Kept opaque to callers.
 */
function encodeKey(parts: [string, string, string, string]): string {
  return parts.join("|");
}

function decodeKey(key: string) {
  const [resourceType, deliveryType, publicId, format] = key.split("|");
  if (!resourceType || !deliveryType || !publicId) throw new Error("Invalid storage key");
  return { resourceType, deliveryType, publicId, format: format ?? "" };
}

export class CloudinaryStorageService implements StorageService {
  readonly enabled = true;

  constructor(config: { cloudName: string; apiKey: string; apiSecret: string }) {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
    });
  }

  async upload(input: UploadInput): Promise<StoredFile> {
    const error = validateUpload(input);
    if (error) throw new Error(error);

    const folder = `prepstack/${input.kind}s/${input.ownerId}`;
    const options =
      input.kind === "avatar"
        ? {
            folder,
            resource_type: "image" as const,
            type: "authenticated" as const,
            // Resize once on upload so we never store or serve originals.
            transformation: [{ width: 256, height: 256, crop: "fill", gravity: "face" }],
            format: "webp",
          }
        : {
            folder,
            resource_type: "auto" as const,
            type: "authenticated" as const,
            use_filename: false,
            unique_filename: true,
          };

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(options, (err, response) => {
        if (err || !response) reject(err ?? new Error("Upload failed"));
        else resolve(response);
      });
      stream.end(input.data);
    });

    return {
      storageKey: encodeKey([
        result.resource_type,
        result.type,
        result.public_id,
        result.format ?? "",
      ]),
      bytes: result.bytes,
      mimeType: input.mimeType,
    };
  }

  async getDownloadUrl(storageKey: string, expiresInSeconds = 300): Promise<string> {
    const { resourceType, deliveryType, publicId, format } = decodeKey(storageKey);
    return cloudinary.utils.private_download_url(publicId, format, {
      resource_type: resourceType,
      type: deliveryType,
      expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
      attachment: true,
    });
  }

  async delete(storageKey: string): Promise<void> {
    const { resourceType, deliveryType, publicId } = decodeKey(storageKey);
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      type: deliveryType,
      invalidate: true,
    });
  }

  async deleteAllForOwner(ownerId: string): Promise<void> {
    for (const kind of ["avatars", "attachments"]) {
      for (const resourceType of ["image", "raw", "video"]) {
        await cloudinary.api.delete_resources_by_prefix(`prepstack/${kind}/${ownerId}/`, {
          resource_type: resourceType,
          type: "authenticated",
        });
      }
    }
  }
}

/** Used when Cloudinary is not configured: uploads are refused with a clear message. */
export class DisabledStorageService implements StorageService {
  readonly enabled = false;

  async upload(): Promise<StoredFile> {
    throw new UploadsDisabledError();
  }

  async getDownloadUrl(): Promise<string> {
    throw new UploadsDisabledError();
  }

  async delete(): Promise<void> {
    // Nothing was ever stored.
  }

  async deleteAllForOwner(): Promise<void> {
    // Nothing was ever stored.
  }
}

let instance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (!instance) {
    instance =
      env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
        ? new CloudinaryStorageService({
            cloudName: env.CLOUDINARY_CLOUD_NAME,
            apiKey: env.CLOUDINARY_API_KEY,
            apiSecret: env.CLOUDINARY_API_SECRET,
          })
        : new DisabledStorageService();
  }
  return instance;
}
