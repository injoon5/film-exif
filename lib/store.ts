import { create } from "zustand"

import {
  BUILT_IN_CAMERA_PRESETS,
  loadCustomCameraPresets,
  saveCustomCameraPreset,
  slugifyCameraId,
} from "@/lib/cameras"
import { inputValueToExifDateTime } from "@/lib/date"
import { applyExifEdits, detectPhotoFormat, hasEdits, isWritableFormat } from "@/lib/exif"
import { readExifSummary } from "@/lib/exif/read"
import type { CameraPreset, PhotoItem, PhotoOverrides, ResolvedExifEdits } from "@/lib/exif/types"

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function defaultOverrides(): PhotoOverrides {
  return { cameraId: null, dateTime: null, stripGps: false }
}

function resolveEdits(photo: PhotoItem, cameras: CameraPreset[]): ResolvedExifEdits {
  const camera = photo.overrides.cameraId
    ? (cameras.find((c) => c.id === photo.overrides.cameraId) ?? null)
    : null

  return {
    make: camera?.make,
    model: camera?.model,
    dateTimeOriginal: inputValueToExifDateTime(photo.overrides.dateTime),
    stripGps: photo.overrides.stripGps,
  }
}

interface PhotoStoreState {
  photos: PhotoItem[]
  selectedIds: Set<string>
  cameras: CameraPreset[]

  hydrateCameras: () => void
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

  hydrateCameras: () => {
    const custom = loadCustomCameraPresets()
    if (custom.length === 0) return
    set((state) => ({
      cameras: [...state.cameras, ...custom.filter((c) => !state.cameras.some((b) => b.id === c.id))],
    }))
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
      cameras: [
        ...state.cameras.filter((c) => !c.custom),
        ...next,
      ],
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
      previewUrl: URL.createObjectURL(file),
      originalExif: null,
      overrides: defaultOverrides(),
      status: "reading",
    }))

    set((state) => ({
      photos: [...state.photos, ...newPhotos],
      selectedIds: new Set([
        ...state.selectedIds,
        ...newPhotos.filter((p) => isWritableFormat(p.format)).map((p) => p.id),
      ]),
    }))

    await Promise.all(
      newPhotos.map(async (photo) => {
        const summary = await readExifSummary(photo.file)
        set((state) => ({
          photos: state.photos.map((p) =>
            p.id === photo.id ? { ...p, originalExif: summary, status: "ready" } : p
          ),
        }))
      })
    )
  },

  removePhoto: (id) => {
    set((state) => {
      const photo = state.photos.find((p) => p.id === id)
      if (photo) {
        URL.revokeObjectURL(photo.previewUrl)
        if (photo.resultUrl) URL.revokeObjectURL(photo.resultUrl)
      }
      const selectedIds = new Set(state.selectedIds)
      selectedIds.delete(id)
      return { photos: state.photos.filter((p) => p.id !== id), selectedIds }
    })
  },

  clearAll: () => {
    for (const photo of get().photos) {
      URL.revokeObjectURL(photo.previewUrl)
      if (photo.resultUrl) URL.revokeObjectURL(photo.resultUrl)
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

  selectAll: () => set((state) => ({ selectedIds: new Set(state.photos.map((p) => p.id)) })),

  clearSelection: () => set({ selectedIds: new Set() }),

  updateOverrides: (ids, overrides) => {
    const idSet = new Set(ids)
    set((state) => ({
      photos: state.photos.map((p) =>
        idSet.has(p.id) ? { ...p, overrides: { ...p.overrides, ...overrides } } : p
      ),
    }))
  },

  processPhotos: async (ids) => {
    const idSet = new Set(ids)
    const { photos, cameras } = get()
    const targets = photos.filter((p) => idSet.has(p.id))

    set((state) => ({
      photos: state.photos.map((p) => (idSet.has(p.id) ? { ...p, status: "processing" } : p)),
    }))

    await Promise.all(
      targets.map(async (photo) => {
        try {
          const edits = resolveEdits(photo, cameras)
          const blob =
            isWritableFormat(photo.format) && hasEdits(edits)
              ? await applyExifEdits(photo.file, photo.format, edits)
              : photo.file

          const resultUrl = URL.createObjectURL(blob)
          set((state) => ({
            photos: state.photos.map((p) =>
              p.id === photo.id
                ? {
                    ...p,
                    status: "done",
                    resultBlob: blob,
                    resultUrl,
                    error: undefined,
                  }
                : p
            ),
          }))
        } catch (error) {
          set((state) => ({
            photos: state.photos.map((p) =>
              p.id === photo.id
                ? { ...p, status: "error", error: error instanceof Error ? error.message : "Failed to write metadata" }
                : p
            ),
          }))
        }
      })
    )
  },
}))
