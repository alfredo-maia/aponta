export const PASTED_IMAGE_MAX_EDGE = 1600;
export const PASTED_IMAGE_JPEG_QUALITY = 0.82;

export function scaleToFit(
  width: number,
  height: number,
  maxEdge: number = PASTED_IMAGE_MAX_EDGE,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width, height };
  const edge = Math.max(width, height);
  if (edge <= maxEdge) return { width, height };
  const ratio = maxEdge / edge;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob !== 'function') {
      resolve(null);
      return;
    }
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Downscales oversized pasted screenshots and recompresses them before upload.
 * Falls back to the original file if the browser cannot decode or encode it.
 */
export async function preparePastedImage(file: File): Promise<File> {
  const isImage = !file.type || file.type.startsWith('image/');
  if (!isImage) return file;
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const next = scaleToFit(bitmap.width, bitmap.height);
    const needsResize = next.width !== bitmap.width || next.height !== bitmap.height;
    const needsCompress = file.size > 350_000;
    if (!needsResize && !needsCompress) return file;

    const canvas = document.createElement('canvas');
    canvas.width = next.width;
    canvas.height = next.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, next.width, next.height);

    const blob = await canvasToBlob(canvas, 'image/jpeg', PASTED_IMAGE_JPEG_QUALITY);
    if (!blob) return file;

    const baseName = (file.name || 'evidencia').replace(/\.[^.]+$/, '') || 'evidencia';
    const cleanName = baseName === 'image' ? `evidencia_${Date.now()}` : baseName;
    return new File([blob], `${cleanName}.jpg`, { type: 'image/jpeg' });
  } finally {
    bitmap.close?.();
  }
}
