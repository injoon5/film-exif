import { create } from "zustand"
import { useShallow } from "zustand/react/shallow"

import {
  BUILT_IN_CAMERA_PRESETS,
  loadCustomCameraPresets,
  saveCustomCameraPreset,
  slugifyCameraId,
} from "@/lib/cameras"
import { mapWithConcurrency } from "@/lib/concurrency"
import { inputValueToExifDateTime } from "@/lib/date"
import {
  applyExifEdits,
  detectPhotoFormat,
  hasEdits,
  isWritableFormat,
} from "@/lib/exif"
import { readExifSummary } from "@/lib/exif/read"
import {
  parseAperture,
  parseFocalLength,
  parseIso,
  parseShutterSpeed,
} from "@/lib/exif/values"
import type {
  CameraPreset,
  PhotoItem,
  PhotoOverrides,
  ResolvedExifEdits,
} from "@/lib/exif/types"
import { loadPhotoView, savePhotoView, type PhotoView } from "@/lib/preferences"
import { createPreviewUrl } from "@/lib/preview"

/** Cap parallel decode / EXIF / write work so large batches don't thrash memory. */
const READ_CONCURRENCY = 4
const PROCESS_CONCURRENCY = 3

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function defaultOverrides(): PhotoOverrides {
  return {
    cameraId: null,
    dateTime: null,
    shutterSpeed: null,
    aperture: null,
    iso: null,
    focalLength: null,
    lens: null,
    filmStock: null,
    stripGps: false,
  }
}

function trimmed(value: string | null): string | null {
  const text = value?.trim()
  return text ? text : null
}

function resolveEdits(
  photo: PhotoItem,
  cameras: CameraPreset[]
): ResolvedExifEdits {
  const { overrides } = photo
  const camera = overrides.cameraId
    ? (cameras.find((c) => c.id === overrides.cameraId) ?? null)
    : null

  return {
    make: camera?.make,
    model: camera?.model,
    dateTimeOriginal: inputValueToExifDateTime(overrides.dateTime),
    exposureTime: parseShutterSpeed(overrides.shutterSpeed),
    fNumber: parseAperture(overrides.aperture),
    iso: parseIso(overrides.iso),
    focalLength: parseFocalLength(overrides.focalLength),
    lensModel: trimmed(overrides.lens),
    description: trimmed(overrides.filmStock),
    stripGps: overrides.stripGps,
  }
}

function revokeUrl(url: string | null | undefined): void {
  if (url) URL.revokeObjectURL(url)
}

interface PhotoStoreState {
  photos: PhotoItem[]
  selectedIds: Set<string>
  cameras: CameraPreset[]
  view: PhotoView

  hydratePreferences: () => void
  setView: (view: PhotoView) => void
  addCustomCamera: (make: string, model: string, label?: string) => CameraPreset

  addFiles: (files: File[]) => Promise<void>
  removePhoto: (id: string) => void
  clearAll: () => void

  toggleSelected: (id: string) => void
  setSelected: (ids: string[]) => void
  selectAll: () => void
  clearSelection: () => void

  updateOverrides: (ids: string[], overrides: Partial<PhotoOverrides>) => void

  processPhotos: (ids: string[]) => Promise<void>
}

export const usePhotoStore = create<PhotoStoreState>((set, get) => ({
  photos: [],
  selectedIds: new Set(),
  cameras: BUILT_IN_CAMERA_PRESETS,
  // Server-rendered default; the stored choice is applied after mount so the
  // markup React hydrates against always matches.
  view: "grid",

  hydratePreferences: () => {
    const custom = loadCustomCameraPresets()
    const view = loadPhotoView()
    set((state) => ({
      view: view ?? state.view,
      cameras:
        custom.length === 0
          ? state.cameras
          : [
              ...state.cameras,
              ...custom.filter(
                (c) => !state.cameras.some((b) => b.id === c.id)
              ),
            ],
    }))
  },

  setView: (view) => {
    savePhotoView(view)
    set({ view })
  },

  addCustomCamera: (make, model, label) => {
    const preset: CameraPreset = {
      id: slugifyCameraId(make, model),
      label: label?.trim() || `${make} ${model}`.trim(),
      make,
      model,
      custom: true,
    }
    const next = saveCustomCameraPreset(preset)
    set((state) => ({
      cameras: [...state.cameras.filter((c) => !c.custom), ...next],
    }))
    return preset
  },

  addFiles: async (files) => {
    const newPhotos: PhotoItem[] = files.map((file) => ({
      id: createId(),
      file,
      name: file.name,
      format: detectPhotoFormat(file),
      mimeType: file.type,
      // Deliberately null: pointing an <img> at the untouched original would
      // make the browser decode a full-resolution photo per card just to throw
      // it away when the downscaled preview lands a moment later.
      previewUrl: null,
      originalExif: null,
      overrides: defaultOverrides(),
      status: "reading",
    }))

    const selectedIds = new Set(get().selectedIds)
    for (const photo of newPhotos) {
      if (isWritableFormat(photo.format)) selectedIds.add(photo.id)
    }

    set((state) => ({
      photos: [...state.photos, ...newPhotos],
      selectedIds,
    }))

    await mapWithConcurrency(newPhotos, READ_CONCURRENCY, async (photo) => {
      const [summary, previewUrl] = await Promise.all([
        readExifSummary(photo.file),
        createPreviewUrl(photo.file),
      ])

      set((state) => {
        if (!state.photos.some((p) => p.id === photo.id)) {
          // Removed while reading — drop the freshly created preview URL.
          revokeUrl(previewUrl)
          return state
        }
        return {
          photos: state.photos.map((p) => {
            if (p.id !== photo.id) return p
            if (p.previewUrl && p.previewUrl !== previewUrl)
              revokeUrl(p.previewUrl)
            return { ...p, originalExif: summary, previewUrl, status: "ready" }
          }),
        }
      })
    })
  },

  removePhoto: (id) => {
    set((state) => {
      const photo = state.photos.find((p) => p.id === id)
      if (!photo) return state
      revokeUrl(photo.previewUrl)
      revokeUrl(photo.resultUrl)
      const selectedIds = new Set(state.selectedIds)
      selectedIds.delete(id)
      return { photos: state.photos.filter((p) => p.id !== id), selectedIds }
    })
  },

  clearAll: () => {
    for (const photo of get().photos) {
      revokeUrl(photo.previewUrl)
      revokeUrl(photo.resultUrl)
    }
    set({ photos: [], selectedIds: new Set() })
  },

  toggleSelected: (id) => {
    set((state) => {
      const selectedIds = new Set(state.selectedIds)
      if (selectedIds.has(id)) selectedIds.delete(id)
      else selectedIds.add(id)
      return { selectedIds }
    })
  },

  setSelected: (ids) => set({ selectedIds: new Set(ids) }),

  selectAll: () =>
    set((state) => ({
      selectedIds: new Set(
        state.photos.filter((p) => isWritableFormat(p.format)).map((p) => p.id)
      ),
    })),

  clearSelection: () => set({ selectedIds: new Set() }),

  updateOverrides: (ids, overrides) => {
    const idSet = new Set(ids)
    set((state) => ({
      // Untouched photos keep their exact object identity so their memoised
      // cards skip re-rendering entirely.
      photos: state.photos.map((p) =>
        idSet.has(p.id)
          ? { ...p, overrides: { ...p.overrides, ...overrides } }
          : p
      ),
    }))
  },

  processPhotos: async (ids) => {
    const idSet = new Set(ids)
    const { photos, cameras } = get()
    const targets = photos.filter((p) => idSet.has(p.id))

    set((state) => ({
      photos: state.photos.map((p) =>
        idSet.has(p.id) ? { ...p, status: "processing" } : p
      ),
    }))

    await mapWithConcurrency(targets, PROCESS_CONCURRENCY, async (photo) => {
      try {
        const edits = resolveEdits(photo, cameras)
        const blob =
          isWritableFormat(photo.format) && hasEdits(edits)
            ? await applyExifEdits(photo.file, photo.format, edits)
            : photo.file

        const resultUrl = URL.createObjectURL(blob)
        set((state) => {
          if (!state.photos.some((p) => p.id === photo.id)) {
            revokeUrl(resultUrl)
            return state
          }
          return {
            photos: state.photos.map((p) => {
              if (p.id !== photo.id) return p
              if (p.resultUrl && p.resultUrl !== resultUrl)
                revokeUrl(p.resultUrl)
              return {
                ...p,
                status: "done",
                resultBlob: blob,
                resultUrl,
                error: undefined,
              }
            }),
          }
        })
      } catch (error) {
        set((state) => ({
          photos: state.photos.map((p) =>
            p.id === photo.id
              ? {
                  ...p,
                  status: "error",
                  error:
                    error instanceof Error
                      ? error.message
                      : "Failed to write metadata",
                }
              : p
          ),
        }))
      }
    })
  },
}))

/**
 * Cards subscribe by id rather than being handed a photo prop, so a store
 * update that rebuilds the `photos` array only re-renders the cards whose own
 * object identity actually changed.
 */
export function usePhoto(id: string): PhotoItem | undefined {
  return usePhotoStore((s) => s.photos.find((p) => p.id === id))
}

/** Ids of every photo, stable across edits thanks to the shallow comparison. */
export function usePhotoIds(): string[] {
  return usePhotoStore(useShallow((s) => s.photos.map((p) => p.id)))
}
