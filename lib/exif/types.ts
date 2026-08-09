export type PhotoFormat = "jpeg" | "png" | "unsupported"

export interface CameraPreset {
  id: string
  label: string
  make: string
  model: string
  note?: string
  /** Box speed of the film this camera ships with — used only as an input hint. */
  iso?: number
  custom?: boolean
}

/** EXIF rational, as piexif expects it: [numerator, denominator]. */
export type Rational = readonly [number, number]

export interface ExifSummary {
  make?: string
  model?: string
  /** Raw EXIF-format string, e.g. "2026:08:07 13:33:52" */
  dateTimeOriginal?: string
  software?: string
  /** Shutter speed in seconds. */
  exposureTime?: number
  fNumber?: number
  iso?: number
  /** Focal length in millimetres. */
  focalLength?: number
  lensModel?: string
  description?: string
  hasGps: boolean
}

/**
 * Every text field is stored exactly as typed and only parsed into EXIF
 * rationals at write time, so a half-finished "1/" never loses what the user
 * meant. `null` means "leave whatever the file already has alone".
 */
export interface PhotoOverrides {
  /** id into the camera preset list, or null if untouched */
  cameraId: string | null
  /** local <input type="datetime-local"> value, or null if untouched */
  dateTime: string | null
  /** e.g. "1/125", "0.5", "2" — seconds */
  shutterSpeed: string | null
  /** f-number, e.g. "2.8" */
  aperture: string | null
  /** e.g. "400" */
  iso: string | null
  /** millimetres, e.g. "35" */
  focalLength: string | null
  lens: string | null
  /** Film stock / free-text note, written to ImageDescription. */
  filmStock: string | null
  stripGps: boolean
}

/** Fully-resolved edit instructions handed to a per-format writer. */
export interface ResolvedExifEdits {
  make?: string
  model?: string
  /** EXIF-format string "YYYY:MM:DD HH:MM:SS", or null/undefined to leave untouched */
  dateTimeOriginal?: string | null
  exposureTime?: Rational | null
  fNumber?: Rational | null
  iso?: number | null
  focalLength?: Rational | null
  lensModel?: string | null
  description?: string | null
  stripGps: boolean
}

export type PhotoStatus = "reading" | "ready" | "processing" | "done" | "error"

export interface PhotoItem {
  id: string
  file: File
  name: string
  format: PhotoFormat
  mimeType: string
  /** null until the downscaled preview has been generated. */
  previewUrl: string | null
  originalExif: ExifSummary | null
  overrides: PhotoOverrides
  status: PhotoStatus
  error?: string
  resultBlob?: Blob
  resultUrl?: string
}
