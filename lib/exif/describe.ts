/**
 * Compact one-line summaries for the grid. Photographers read exposure as a
 * run of numbers ("1/125 ƒ/8 ISO 400"), so these keep that shape rather than
 * spelling each field out.
 */

import { formatExifDateTimeForDisplay } from "@/lib/date"
import {
  formatAperture,
  formatFocalLength,
  formatIso,
  formatShutterSpeed,
  parseAperture,
  parseFocalLength,
  parseIso,
  parseShutterSpeed,
} from "@/lib/exif/values"
import type { ExifSummary, PhotoOverrides, Rational } from "@/lib/exif/types"

function join(
  parts: (string | null | undefined)[],
  separator: string
): string | null {
  const kept = parts.filter((part): part is string => Boolean(part))
  return kept.length > 0 ? kept.join(separator) : null
}

function ratio([numerator, denominator]: Rational): number {
  return numerator / denominator
}

/** What the file already carries: "Kodak FUNSAVER 800 · 7 Aug 2026 · 1/125 ƒ/8". */
export function describeExifSummary(
  summary: ExifSummary | null | undefined
): string | null {
  if (!summary) return null
  return join(
    [
      join([summary.make, summary.model], " "),
      formatExifDateTimeForDisplay(summary.dateTimeOriginal),
      describeExposure(
        formatShutterSpeed(summary.exposureTime),
        formatAperture(summary.fNumber),
        formatIso(summary.iso),
        formatFocalLength(summary.focalLength)
      ),
    ],
    " · "
  )
}

/** What the user has typed, normalised the same way a camera would write it. */
export function describeExposureOverrides(
  overrides: PhotoOverrides
): string | null {
  const shutter = parseShutterSpeed(overrides.shutterSpeed)
  const aperture = parseAperture(overrides.aperture)
  const focal = parseFocalLength(overrides.focalLength)

  return describeExposure(
    shutter ? formatShutterSpeed(ratio(shutter)) : null,
    aperture ? formatAperture(ratio(aperture)) : null,
    formatIso(parseIso(overrides.iso) ?? undefined),
    focal ? formatFocalLength(ratio(focal)) : null
  )
}

function describeExposure(
  shutter: string | null,
  aperture: string | null,
  iso: string | null,
  focalLength: string | null
): string | null {
  return join([shutter, aperture, iso, focalLength], " ")
}
