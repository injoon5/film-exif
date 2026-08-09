import { hasTagContent } from "@/lib/exif/build"
import { writeJpegExif } from "@/lib/exif/write-jpeg"
import { writePngExif } from "@/lib/exif/write-png"
import type { PhotoFormat, ResolvedExifEdits } from "@/lib/exif/types"

export function detectPhotoFormat(file: File): PhotoFormat {
  const mime = file.type.toLowerCase()
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpeg"
  if (mime === "image/png") return "png"

  // Some OSes/browsers hand us files with an empty or generic MIME type.
  const name = file.name.toLowerCase()
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "jpeg"
  if (name.endsWith(".png")) return "png"

  return "unsupported"
}

export function isWritableFormat(format: PhotoFormat): boolean {
  return format === "jpeg" || format === "png"
}

export function hasEdits(edits: ResolvedExifEdits): boolean {
  return hasTagContent(edits) || edits.stripGps
}

export async function applyExifEdits(
  file: File,
  format: PhotoFormat,
  edits: ResolvedExifEdits
): Promise<Blob> {
  switch (format) {
    case "jpeg":
      return writeJpegExif(file, edits)
    case "png":
      return writePngExif(file, edits)
    case "unsupported":
      throw new Error(
        "Metadata editing isn’t supported for this file type yet."
      )
    default: {
      const exhaustive: never = format
      throw new Error(`Unhandled photo format: ${String(exhaustive)}`)
    }
  }
}

export { readExifSummary } from "@/lib/exif/read"
export type { PhotoFormat, ResolvedExifEdits } from "@/lib/exif/types"
