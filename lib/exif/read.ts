import { parse as exifrParse } from "exifr"

import type { ExifSummary } from "@/lib/exif/types"

/**
 * Reads whatever EXIF/TIFF metadata is already embedded in a file, across
 * any format exifr understands (JPEG, PNG, HEIC, WebP, TIFF, ...). Used only
 * to show the user what's already there — writing is handled separately per
 * format in write-jpeg.ts / write-png.ts.
 */
export async function readExifSummary(file: File): Promise<ExifSummary | null> {
  try {
    const tags = await exifrParse(file, {
      gps: true,
      tiff: true,
      exif: true,
      pick: ["Make", "Model", "Software", "DateTimeOriginal", "latitude", "longitude"],
    })

    if (!tags) {
      return { hasGps: false }
    }

    return {
      make: typeof tags.Make === "string" ? tags.Make.trim() : undefined,
      model: typeof tags.Model === "string" ? tags.Model.trim() : undefined,
      software: typeof tags.Software === "string" ? tags.Software.trim() : undefined,
      dateTimeOriginal: dateToExifString(tags.DateTimeOriginal),
      hasGps: typeof tags.latitude === "number" && typeof tags.longitude === "number",
    }
  } catch {
    // Unparseable or no metadata segment at all — not an error state for us.
    return { hasGps: false }
  }
}

function dateToExifString(value: unknown): string | undefined {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return undefined
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${value.getFullYear()}:${pad(value.getMonth() + 1)}:${pad(value.getDate())} ${pad(
    value.getHours()
  )}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`
}
