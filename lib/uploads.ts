export const fixyAssetsBucket = "fixy-assets";

export const uploadScopes = {
  workshop_logo: {
    folder: "workshops/logos",
    maxFiles: 1,
    maxSizeInBytes: 5 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/webp", "image/png", "image/svg+xml"],
  },
  payment_proof: {
    folder: "payments/proofs",
    maxFiles: 1,
    maxSizeInBytes: 10 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/webp", "image/png", "application/pdf"],
  },
  vehicle_photo: {
    folder: "vehicles/photos",
    maxFiles: 12,
    maxSizeInBytes: 8 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/webp", "image/png"],
  },
  work_order_reference: {
    folder: "work-orders/references",
    maxFiles: 12,
    maxSizeInBytes: 8 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/webp", "image/png", "application/pdf"],
  },
} as const;

export type UploadScope = keyof typeof uploadScopes;

export function isUploadScope(value: string): value is UploadScope {
  return value in uploadScopes;
}

export function getUploadConfig(scope: UploadScope) {
  return uploadScopes[scope];
}

export function sanitizeUploadPathSegment(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
}
