"use client"

import * as React from "react"
import { DownloadIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
    toast.error("Couldn't process those photos")
    return
  }

  if (photos.length === 1) {
    const photo = photos[0]!
    const url = photo.resultUrl ?? URL.createObjectURL(photo.resultBlob!)
    const shouldRevoke = !photo.resultUrl
    const a = document.createElement("a")
    a.href = url
    a.download = photo.name
    a.click()
    if (shouldRevoke) setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return
  }

  const names = dedupeFileNames(photos.map((p) => p.name))
  const buffers = await Promise.all(photos.map((p) => p.resultBlob!.arrayBuffer()))
  const zipBlob = await createZip(
    buffers.map((buffer, i) => ({ name: names[i]!, data: new Uint8Array(buffer) }))
  )

  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement("a")
  a.href = url
  a.download = zipName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function ExportBar() {
  const photoCount = usePhotoStore((s) => s.photos.length)
  const selectedCount = usePhotoStore((s) => s.selectedIds.size)
  const [isExporting, setIsExporting] = React.useState<"selected" | "all" | null>(null)

  if (photoCount === 0) return null

  async function handleExport(mode: "selected" | "all") {
    setIsExporting(mode)
    try {
      const { photos, selectedIds } = usePhotoStore.getState()
      const ids = mode === "selected" ? Array.from(selectedIds) : photos.map((p) => p.id)
      await downloadPhotos(ids, mode === "selected" ? "photos-selected.zip" : "photos-all.zip")
    } catch {
      toast.error("Export failed — try again")
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className="sticky bottom-0 z-30 -mx-4 border-t border-border/60 bg-background/85 px-4 py-3 backdrop-blur-md supports-backdrop-filter:bg-background/70 sm:-mx-6 sm:px-6">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          className="h-10 sm:h-8"
          onClick={() => handleExport("selected")}
          disabled={selectedCount === 0 || isExporting !== null}
        >
          {isExporting === "selected" ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
          Download selected ({selectedCount})
        </Button>
        <Button className="h-10 sm:h-8" onClick={() => handleExport("all")} disabled={isExporting !== null}>
          {isExporting === "all" ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
          Download all
        </Button>
      </div>
    </div>
  )
}
