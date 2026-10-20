/**
 * Maps a validated (allowlisted) upload MIME type to the ONLY file
 * extension that may ever be written to disk for it. Never derive the
 * on-disk extension from `file.originalname` — `mimetype` is a
 * client-controlled HTTP header and `originalname` is a client-controlled
 * string, so trusting either one lets an uploader store e.g. `evil.html`
 * declared as `text/plain` (an allowed type) and get it served back as
 * `text/html` by the static file server (Express/Nest infer Content-Type
 * from the file's extension on disk, not from what was validated at
 * upload time) — a stored-XSS primitive disguised as an ordinary
 * attachment. Picking the extension ourselves from the MIME type that
 * `fileFilter` already validated closes that gap: a file accepted as
 * `text/plain` can only ever be written as `.txt`.
 */
export const SAFE_UPLOAD_EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'application/zip': '.zip',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
};

/**
 * Resolves the safe on-disk extension for a MIME type already approved by
 * a `fileFilter` using the same allowlist as `SAFE_UPLOAD_EXTENSIONS`.
 * Falls back to `.bin` (a generic, non-renderable extension) if somehow
 * called with a MIME type outside the map — this should never happen in
 * practice since `fileFilter` rejects anything not in the map first, but
 * a safe fallback is cheaper than an unhandled exception mid-upload.
 */
export function resolveSafeUploadExtension(mimeType: string): string {
  return SAFE_UPLOAD_EXTENSIONS[mimeType] ?? '.bin';
}
