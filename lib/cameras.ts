import type { CameraPreset } from "@/lib/exif/types"

export const BUILT_IN_CAMERA_PRESETS: CameraPreset[] = [
  {
    id: "kodak-funsaver-800",
    label: "Kodak FunSaver 800",
    make: "Kodak",
    model: "FUNSAVER 800",
    iso: 800,
  },
  {
    id: "iphone",
    label: "iPhone",
    make: "Apple",
    model: "iPhone",
  },
]

const STORAGE_KEY = "film-exif:custom-cameras"

function isCameraPreset(value: unknown): value is CameraPreset {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.make === "string" &&
    typeof candidate.model === "string"
  )
}

export function loadCustomCameraPresets(): CameraPreset[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCameraPreset)
  } catch {
    return []
  }
}

export function saveCustomCameraPreset(preset: CameraPreset): CameraPreset[] {
  const next = [
    ...loadCustomCameraPresets().filter((p) => p.id !== preset.id),
    preset,
  ]
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }
  return next
}

export function slugifyCameraId(make: string, model: string): string {
  const slug = `custom-${make}-${model}`
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
  return slug || `custom-${Date.now()}`
}
