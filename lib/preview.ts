import { HEADER_BYTES, readImageSize } from "@/lib/image-size"

/** Max edge length for grid previews — keeps memory + decode cost down. */
const PREVIEW_MAX_EDGE = 960
const PREVIEW_QUALITY = 0.82

/**
 * Builds a downscaled JPEG blob URL for grid display.
 *
 * The size is read from the file header first so the decoder can produce a
 * thumbnail-sized bitmap in one pass instead of materialising the full image.
 * Every step degrades gracefully: an unreadable header falls back to a full
 * decode, and a failed decode falls back to a plain object URL of the original
 * (which is also the right answer for formats the canvas can't take, like HEIC).
 */
export async function createPreviewUrl(file: File): Promise<string> {
  if (typeof createImageBitmap !== "function") {
    return URL.createObjectURL(file)
  }

  try {
    const intrinsic = await readIntrinsicSize(file)
    if (
      intrinsic &&
      Math.max(intrinsic.width, intrinsic.height) <= PREVIEW_MAX_EDGE
    ) {
      // Already small enough — a direct object URL beats a pointless re-encode.
      return URL.createObjectURL(file)
    }

    const bitmap = await decodeScaled(file, intrinsic)
    try {
      if (Math.max(bitmap.width, bitmap.height) <= PREVIEW_MAX_EDGE) {
        return (await encode(bitmap)) ?? URL.createObjectURL(file)
      }

      // No usable header, so the decode came back full size — scale it here.
      const scale = PREVIEW_MAX_EDGE / Math.max(bitmap.width, bitmap.height)
      const width = Math.max(1, Math.round(bitmap.width * scale))
      const height = Math.max(1, Math.round(bitmap.height * scale))
      return (await encode(bitmap, width, height)) ?? URL.createObjectURL(file)
    } finally {
      bitmap.close()
    }
  } catch {
    return URL.createObjectURL(file)
  }
}

async function readIntrinsicSize(file: File) {
  try {
    const header = new Uint8Array(
      await file.slice(0, HEADER_BYTES).arrayBuffer()
    )
    return readImageSize(header)
  } catch {
    return null
  }
}

function decodeScaled(
  file: File,
  intrinsic: { width: number; height: number } | null
): Promise<ImageBitmap> {
  // `imageOrientation` matters: an <img> honours EXIF orientation by default,
  // so a canvas-built preview has to as well or rotated phone shots would flip
  // depending on whether they needed downscaling.
  const options: ImageBitmapOptions = { imageOrientation: "from-image" }
  if (!intrinsic) return createImageBitmap(file, options)

  const scale = PREVIEW_MAX_EDGE / Math.max(intrinsic.width, intrinsic.height)
  // Constrain the long edge only — the decoder keeps the aspect ratio, which
  // dodges the rounding drift of specifying both.
  const constraint =
    intrinsic.width >= intrinsic.height
      ? { resizeWidth: Math.max(1, Math.round(intrinsic.width * scale)) }
      : { resizeHeight: Math.max(1, Math.round(intrinsic.height * scale)) }

  return createImageBitmap(file, {
    ...options,
    ...constraint,
    resizeQuality: "medium",
  })
}

async function encode(
  bitmap: ImageBitmap,
  width = bitmap.width,
  height = bitmap.height
): Promise<string | null> {
  const blob = await toBlob(bitmap, width, height)
  return blob ? URL.createObjectURL(blob) : null
}

async function toBlob(
  bitmap: ImageBitmap,
  width: number,
  height: number
): Promise<Blob | null> {
  if (typeof OffscreenCanvas === "function") {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0, width, height)
      return canvas.convertToBlob({
        type: "image/jpeg",
        quality: PREVIEW_QUALITY,
      })
    }
  }

  if (typeof document === "undefined") return null
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  ctx.drawImage(bitmap, 0, 0, width, height)
  return new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", PREVIEW_QUALITY)
  )
}
