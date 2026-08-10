/**
 * Turns resolved edits into the two IFDs both writers need. JPEG splices these
 * into an APP1 segment; PNG wraps the same TIFF block in an `eXIf` chunk, so
 * the tag mapping has to live in exactly one place.
 */

import type { IExif, IExifElement } from "piexif-ts"

import { loadPiexif } from "@/lib/exif/piexif"
import type { ResolvedExifEdits } from "@/lib/exif/types"

/** True when there is at least one tag to write (GPS stripping aside). */
export function hasTagContent(edits: ResolvedExifEdits): boolean {
  return Boolean(
    edits.make ||
    edits.model ||
    edits.dateTimeOriginal ||
    edits.exposureTime ||
    edits.fNumber ||
    edits.iso ||
    edits.focalLength ||
    edits.lensModel ||
    edits.description
  )
}

export interface BuiltIfds {
  zeroth: IExifElement
  exif: IExifElement
}

/**
 * Merges `edits` over the tags already present in `existing`. Fields left
 * `null`/`undefined` keep whatever the file had.
 */
export async function buildIfds(
  edits: ResolvedExifEdits,
  existing?: IExif
): Promise<BuiltIfds> {
  const { TagValues } = await loadPiexif()
  const { ImageIFD, ExifIFD } = TagValues

  const zeroth: IExifElement = { ...(existing?.["0th"] ?? {}) }
  const exif: IExifElement = { ...(existing?.Exif ?? {}) }

  if (edits.make) zeroth[ImageIFD.Make] = edits.make
  if (edits.model) zeroth[ImageIFD.Model] = edits.model
  if (edits.description) zeroth[ImageIFD.ImageDescription] = edits.description

  if (edits.dateTimeOriginal) {
    zeroth[ImageIFD.DateTime] = edits.dateTimeOriginal
    exif[ExifIFD.DateTimeOriginal] = edits.dateTimeOriginal
    exif[ExifIFD.DateTimeDigitized] = edits.dateTimeOriginal
  }

  if (edits.exposureTime) exif[ExifIFD.ExposureTime] = [...edits.exposureTime]
  if (edits.fNumber) exif[ExifIFD.FNumber] = [...edits.fNumber]
  if (edits.focalLength) exif[ExifIFD.FocalLength] = [...edits.focalLength]
  if (edits.iso) exif[ExifIFD.ISOSpeedRatings] = edits.iso
  if (edits.lensModel) exif[ExifIFD.LensModel] = edits.lensModel

  return { zeroth, exif }
}
