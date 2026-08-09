"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CameraCombobox } from "@/components/camera-combobox"
import { DateTimeField } from "@/components/date-time-field"
import { PhotoDropzone } from "@/components/photo-dropzone"
import { isWritableFormat } from "@/lib/exif"
import { usePhotoStore } from "@/lib/store"

export function BatchToolbar() {
  const photos = usePhotoStore((s) => s.photos)
  const selectedIds = usePhotoStore((s) => s.selectedIds)
  const cameras = usePhotoStore((s) => s.cameras)
  const selectAll = usePhotoStore((s) => s.selectAll)
  const clearSelection = usePhotoStore((s) => s.clearSelection)
  const updateOverrides = usePhotoStore((s) => s.updateOverrides)
  const addCustomCamera = usePhotoStore((s) => s.addCustomCamera)
  const addFiles = usePhotoStore((s) => s.addFiles)

  const [batchCameraId, setBatchCameraId] = React.useState<string | null>(null)
  const [batchDateTime, setBatchDateTime] = React.useState<string | null>(null)

  const writableCount = photos.filter((p) => isWritableFormat(p.format)).length
  const selectedCount = selectedIds.size
  const allSelected = writableCount > 0 && selectedCount === writableCount

  function handleApply() {
    if (selectedCount === 0) {
      toast.error("Select at least one photo first")
      return
    }
    if (!batchCameraId && !batchDateTime) {
      toast.error("Choose a camera or a date to apply")
      return
    }
    updateOverrides(Array.from(selectedIds), {
      ...(batchCameraId ? { cameraId: batchCameraId } : {}),
      ...(batchDateTime ? { dateTime: batchDateTime } : {}),
    })
    toast.success(`Applied to ${selectedCount} photo${selectedCount === 1 ? "" : "s"}`)
  }

  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-md supports-backdrop-filter:bg-background/70 sm:-mx-6 sm:px-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{photos.length}</span>
            <span className="text-muted-foreground">
              photo{photos.length === 1 ? "" : "s"} · {selectedCount} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={allSelected ? clearSelection : selectAll}>
              {allSelected ? "Clear selection" : "Select all"}
            </Button>
            <PhotoDropzone variant="compact" onFiles={addFiles} />
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Camera</span>
            <CameraCombobox
              cameras={cameras}
              value={batchCameraId}
              onChange={setBatchCameraId}
              onAddCustom={addCustomCamera}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Date &amp; time taken</span>
            <DateTimeField value={batchDateTime} onChange={setBatchDateTime} />
          </div>
          <Button
            onClick={handleApply}
            disabled={selectedCount === 0}
            className="ml-auto h-10 sm:h-8"
          >
            Apply to {selectedCount || ""} selected
          </Button>
        </div>
      </div>
    </div>
  )
}
