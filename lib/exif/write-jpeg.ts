import type { IExif } from "piexif-ts"

import {
  arrayBufferToBinaryString,
  binaryStringToUint8Array,
} from "@/lib/binary"
import { buildIfds } from "@/lib/exif/build"
import { loadPiexif } from "@/lib/exif/piexif"
import type { ResolvedExifEdits } from "@/lib/exif/types"

/**
 * Rewrites the JPEG's APP1/EXIF segment in place. The compressed image data
 * is never touched, so this can't introduce any generation loss.
 */
export async function writeJpegExif(
  file: File | Blob,
  edits: ResolvedExifEdits
): Promise<Blob> {
  const [piexif, buffer] = await Promise.all([loadPiexif(), file.arrayBuffer()])
  const binary = arrayBufferToBinaryString(buffer)

  let existing: IExif
  try {
    existing = piexif.load(binary)
  } catch {
    existing = {}
  }

  const { zeroth, exif } = await buildIfds(edits, existing)

  const nextExif: IExif = { "0th": zeroth, Exif: exif }
  if (!edits.stripGps && existing.GPS && Object.keys(existing.GPS).length > 0) {
    nextExif.GPS = existing.GPS
  }

  const exifBytes = piexif.dump(nextExif)
  const newBinary = piexif.insert(exifBytes, binary)
  const bytes = binaryStringToUint8Array(newBinary)
  return new Blob([bytes], { type: "image/jpeg" })
}
