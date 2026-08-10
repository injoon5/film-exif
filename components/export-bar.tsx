"use client"

import * as React from "react"
import { DownloadIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { downloadBlob, downloadObjectUrl } from "@/lib/download"
import { createZip, dedupeFileNames } from "@/lib/zip"
import { usePhotoStore } from "@/lib/store"

async function downloadPhotos(ids: string[], zipName: string) {
  if (ids.length === 0) {
    toast.error("Nothing to export")
    return
  }

  await usePhotoStore.getState().processPhotos(ids)
  const idSet = new Set(ids)
  const photos = usePhotoStore
    .getState()
    .photos.filter((p) => idSet.has(p.id) && p.resultBlob)

  if (photos.length === 0) {
    const failed = usePhotoStore
      .getState()
      .photos.filter((p) => idSet.has(p.id) && p.status === "error")
    const detail = failed[0]?.error
    toast.error(
      detail
        ? `Couldn’t process those photos: ${detail}`
        : "Couldn’t process those photos"
    )
    return
  }

  if (photos.length === 1) {
    const photo = photos[0]!
    if (photo.resultUrl) {
      downloadObjectUrl(photo.resultUrl, photo.name)
    } else {
      downloadBlob(photo.resultBlob!, photo.name)
    }
    return
  }

  const names = dedupeFileNames(photos.map((p) => p.name))
  const buffers = await Promise.all(
    photos.map((p) => p.resultBlob!.arrayBuffer())
  )
  const zipBlob = await createZip(
    buffers.map((buffer, i) => ({
      name: names[i]!,
      data: new Uint8Array(buffer),
    }))
  )

  downloadBlob(zipBlob, zipName)
}

export function ExportBar() {
  const photoCount = usePhotoStore((s) => s.photos.length)
  const selectedCount = usePhotoStore((s) => s.selectedIds.size)
  const [isExporting, setIsExporting] = React.useState<
    "selected" | "all" | null
  >(null)

  async function handleExport(mode: "selected" | "all") {
    setIsExporting(mode)
    try {
      const { photos, selectedIds } = usePhotoStore.getState()
      const ids =
        mode === "selected" ? Array.from(selectedIds) : photos.map((p) => p.id)
      await downloadPhotos(
        ids,
        mode === "selected" ? "photos-selected.zip" : "photos-all.zip"
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Export failed — try again"
      toast.error(message)
    } finally {
      setIsExporting(null)
    }
  }

  if (photoCount === 0) return null

  const busy = isExporting !== null

  return (
    <div className="sticky bottom-0 z-30 -mx-4 border-t border-border/60 bg-background/85 px-4 py-3 backdrop-blur-md supports-backdrop-filter:bg-background/70 sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Metadata is written on export — your originals stay untouched.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-10 transition-transform active:scale-[0.97] sm:h-8"
            onClick={() => handleExport("selected")}
            disabled={selectedCount === 0 || busy}
          >
            {isExporting === "selected" ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <DownloadIcon />
            )}
            Download selected
            {selectedCount > 0 && (
              <span className="tabular-nums opacity-60">{selectedCount}</span>
            )}
          </Button>
          <Button
            className="h-10 transition-transform active:scale-[0.97] sm:h-8"
            onClick={() => handleExport("all")}
            disabled={busy}
          >
            {isExporting === "all" ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <DownloadIcon />
            )}
            Download all
            <span className="tabular-nums opacity-60">{photoCount}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
