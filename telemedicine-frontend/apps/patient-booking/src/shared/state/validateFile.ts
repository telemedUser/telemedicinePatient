export const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "application/pdf",
] as const;

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type FileValidation =
  | { ok: true }
  | { ok: false; reason: "type" | "size" };

export function validateFile(f: { mime: string; sizeBytes: number }): FileValidation {
  if (!ALLOWED_MIME.includes(f.mime as (typeof ALLOWED_MIME)[number])) {
    return { ok: false, reason: "type" };
  }
  if (f.sizeBytes > MAX_FILE_BYTES) {
    return { ok: false, reason: "size" };
  }
  return { ok: true };
}
