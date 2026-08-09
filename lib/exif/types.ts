export type PhotoFormat = "jpeg" | "png" | "unsupported"

export interface CameraPreset {
  id: string
  label: string
  make: string
  model: string
  note?: string
  custom?: boolean
}

export interface ExifSummary {
  make?: string
  model?: string
  /** Raw EXIF-format string, e.g. "2026:08:07 13:33:52" */
  dateTimeOriginal?: string
  software?: string
  hasGps: boolean
}

export interface PhotoOverrides {
  /** id into the camera preset list, or null if untouched */
  cameraId: string | null
  /** local <input type="datetime-local"> value, or null if untouched */
  dateTime: string | null
  stripGps: boolean
}

/** Fully-resolved edit instructions handed to a per-format writer. */
export interface ResolvedExifEdits {
  make?: string
  model?: string
  /** EXIF-format string "YYYY:MM:DD HH:MM:SS", or null/undefined to leave untouched */
  dateTimeOriginal?: string | null
  stripGps: boolean
}

export type PhotoStatus = "reading" | "ready" | "processing" | "done" | "error"

export interface PhotoItem {
  id: string
  file: File
  name: string
  format: PhotoFormat
  mimeType: string
  previewUrl: string
  originalExif: ExifSummary | null
  overrides: PhotoOverrides
  status: PhotoStatus
  error?: string
  resultBlob?: Blob
  resultUrl?: string
}
