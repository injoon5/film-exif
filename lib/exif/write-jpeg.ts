import piexif from "piexif-ts"

import { arrayBufferToBinaryString, binaryStringToUint8Array } from "@/lib/binary"
import type { ResolvedExifEdits } from "@/lib/exif/types"

// Lab scanners and phones sometimes write slightly malformed tag values.
// Skip the offending tag instead of throwing so one bad tag can't block a
// whole batch export.
piexif.setErrorByPass(true)

/**
 * Rewrites the JPEG's APP1/EXIF segment in place. The compressed image data
 * is never touched, so this can't introduce any generation loss.
 */
export async function writeJpegExif(file: File | Blob, edits: ResolvedExifEdits): Promise<Blob> {
  const buffer = await file.arrayBuffer()
  const binary = arrayBufferToBinaryString(buffer)

  let existing: piexif.IExif
  try {
    existing = piexif.load(binary)
  } catch {
    existing = {}
  }

  const zeroth = { ...(existing["0th"] ?? {}) }
  const exif = { ...(existing["Exif"] ?? {}) }

  if (edits.make) {
    zeroth[piexif.TagValues.ImageIFD.Make] = edits.make
  }
  if (edits.model) {
    zeroth[piexif.TagValues.ImageIFD.Model] = edits.model
  }
  if (edits.dateTimeOriginal) {
    zeroth[piexif.TagValues.ImageIFD.DateTime] = edits.dateTimeOriginal
    exif[piexif.TagValues.ExifIFD.DateTimeOriginal] = edits.dateTimeOriginal
    exif[piexif.TagValues.ExifIFD.DateTimeDigitized] = edits.dateTimeOriginal
  }

  const nextExif: piexif.IExif = { "0th": zeroth, Exif: exif }
  if (!edits.stripGps && existing.GPS && Object.keys(existing.GPS).length > 0) {
    nextExif.GPS = existing.GPS
  }

  const exifBytes = piexif.dump(nextExif)
  const newBinary = piexif.insert(exifBytes, binary)
  const bytes = binaryStringToUint8Array(newBinary)
  return new Blob([bytes], { type: "image/jpeg" })
}
