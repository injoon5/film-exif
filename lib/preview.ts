/** Max edge length for grid previews — keeps memory + decode cost down. */
const PREVIEW_MAX_EDGE = 960
const PREVIEW_QUALITY = 0.82

/**
 * Builds a downscaled JPEG blob URL for grid display. Falls back to a raw
 * object URL of the original file when bitmap/canvas isn't available or fails
 * (e.g. HEIC on some browsers).
 */
export async function createPreviewUrl(file: File): Promise<string> {
  try {
    if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
      return URL.createObjectURL(file)
    }

    const bitmap = await createImageBitmap(file)
    try {
      const scale = Math.min(1, PREVIEW_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
      if (scale >= 1) {
        // Already small enough — keep a direct object URL (cheaper than re-encode).
        return URL.createObjectURL(file)
      }

      const width = Math.max(1, Math.round(bitmap.width * scale))
      const height = Math.max(1, Math.round(bitmap.height * scale))
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) return URL.createObjectURL(file)

      ctx.drawImage(bitmap, 0, 0, width, height)
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", PREVIEW_QUALITY)
      )
      if (!blob) return URL.createObjectURL(file)
      return URL.createObjectURL(blob)
    } finally {
      bitmap.close()
    }
  } catch {
    return URL.createObjectURL(file)
  }
}
