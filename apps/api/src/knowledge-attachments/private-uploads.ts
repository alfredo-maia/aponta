import { existsSync, mkdirSync } from 'fs';
import { isAbsolute, join } from 'path';

/**
 * Knowledge attachments live outside `./uploads` (the directory
 * `app.useStaticAssets` serves at `/uploads` in main.ts) so a PRIVATE
 * article's files are never reachable by a bare URL — only through the
 * visibility-checked download route (D-09/S4.0). Configurable via env for
 * deploys that want a different mount point (see docker-compose.yml's
 * `aponta_uploads_private` volume).
 */
export function getPrivateKnowledgeUploadsDir(): string {
  const configured =
    process.env.KNOWLEDGE_PRIVATE_UPLOADS_DIR || 'uploads-private/knowledge';
  return isAbsolute(configured) ? configured : join(process.cwd(), configured);
}

export function ensurePrivateKnowledgeUploadsDir(): string {
  const dir = getPrivateKnowledgeUploadsDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// Defense in depth (AC-18): `filename` is always server-generated
// (randomUUID + resolveSafeUploadExtension), never taken from client
// input, but the download path still refuses to resolve anything that
// could escape the private directory if that invariant were ever broken
// (e.g. a corrupted row).
const UNSAFE_FILENAME = /[\\/]|\.\./;

export function isSafeStoredFilename(filename: string): boolean {
  return (
    typeof filename === 'string' &&
    filename.length > 0 &&
    !UNSAFE_FILENAME.test(filename)
  );
}
