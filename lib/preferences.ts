/** How the roll is laid out: roomy cards, or one dense row per photo. */
export type PhotoView = "grid" | "table"

const STORAGE_KEY = "film-exif:view"

export function isPhotoView(value: unknown): value is PhotoView {
  return value === "grid" || value === "table"
}

export function loadPhotoView(): PhotoView | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return isPhotoView(raw) ? raw : null
  } catch {
    return null
  }
}

export function savePhotoView(view: PhotoView): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, view)
  } catch {
    // Private-mode storage quotas — the preference just won't stick.
  }
}
