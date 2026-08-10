import type { ExifSummary } from "@/lib/exif/types"

type ExifrParse = (typeof import("exifr"))["parse"]

let parserPromise: Promise<ExifrParse> | null = null

/** Deferred so exifr stays out of the initial bundle — nothing is read until
 * the user actually drops a photo in. */
function loadParser(): Promise<ExifrParse> {
  parserPromise ??= import("exifr").then((mod) => mod.parse)
  return parserPromise
}

const PICKED_TAGS = [
  "Make",
  "Model",
  "Software",
  "DateTimeOriginal",
  "ExposureTime",
  "FNumber",
  "ISO",
  "ISOSpeedRatings",
  "PhotographicSensitivity",
  "FocalLength",
  "LensModel",
  "ImageDescription",
  "latitude",
  "longitude",
]

/**
 * Reads whatever EXIF/TIFF metadata is already embedded in a file, across
 * any format exifr understands (JPEG, PNG, HEIC, WebP, TIFF, ...). Used only
 * to show the user what's already there — writing is handled separately per
 * format in write-jpeg.ts / write-png.ts.
 */
export async function readExifSummary(file: File): Promise<ExifSummary | null> {
  try {
    const parse = await loadParser()
    const tags = await parse(file, {
      gps: true,
      tiff: true,
      exif: true,
      pick: PICKED_TAGS,
    })

    if (!tags) {
      return { hasGps: false }
    }

    return {
      make: text(tags.Make),
      model: text(tags.Model),
      software: text(tags.Software),
      dateTimeOriginal: dateToExifString(tags.DateTimeOriginal),
      exposureTime: positiveNumber(tags.ExposureTime),
      fNumber: positiveNumber(tags.FNumber),
      iso: positiveNumber(
        tags.ISO ?? tags.ISOSpeedRatings ?? tags.PhotographicSensitivity
      ),
      focalLength: positiveNumber(tags.FocalLength),
      lensModel: text(tags.LensModel),
      description: text(tags.ImageDescription),
      hasGps:
        typeof tags.latitude === "number" && typeof tags.longitude === "number",
    }
  } catch {
    // Unparseable or no metadata segment at all — not an error state for us.
    return { hasGps: false }
  }
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

/** ISO in particular can come back as an array (`ISOSpeedRatings` has count N). */
function positiveNumber(value: unknown): number | undefined {
  const candidate = Array.isArray(value) ? value[0] : value
  if (
    typeof candidate !== "number" ||
    !Number.isFinite(candidate) ||
    candidate <= 0
  ) {
    return undefined
  }
  return candidate
}

function dateToExifString(value: unknown): string | undefined {
  if (!(value instanceof Date) || Number.isNaN(value.getTime()))
    return undefined
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${value.getFullYear()}:${pad(value.getMonth() + 1)}:${pad(value.getDate())} ${pad(
    value.getHours()
  )}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`
}
