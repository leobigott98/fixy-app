export const fixyAssetsBucket = "fixy-assets";

export const uploadScopes = {
  workshop_logo: {
    folder: "workshops/logos",
    maxFiles: 1,
    maxSizeInBytes: 5 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/webp", "image/png", "image/svg+xml"],
  },
  workshop_gallery: {
    folder: "workshops/gallery",
    maxFiles: 8,
    maxSizeInBytes: 8 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/webp", "image/png"],
  },
  payment_proof: {
    folder: "payments/proofs",
    maxFiles: 1,
    maxSizeInBytes: 10 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/webp", "image/png", "application/pdf"],
  },
  expense_asset: {
    folder: "expenses/assets",
    maxFiles: 8,
    maxSizeInBytes: 10 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/webp", "image/png", "application/pdf"],
  },
  mechanic_photo: {
    folder: "mechanics/photos",
    maxFiles: 1,
    maxSizeInBytes: 8 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/webp", "image/png"],
  },
  vehicle_photo: {
    folder: "vehicles/photos",
    maxFiles: 12,
    maxSizeInBytes: 8 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/webp", "image/png"],
  },
  owner_profile_photo: {
    folder: "owners/avatars",
    maxFiles: 1,
    maxSizeInBytes: 8 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/webp", "image/png"],
  },
  owner_vehicle_photo: {
    folder: "owners/vehicles",
    maxFiles: 12,
    maxSizeInBytes: 8 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/webp", "image/png"],
  },
  owner_service_photo: {
    folder: "owners/services",
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
