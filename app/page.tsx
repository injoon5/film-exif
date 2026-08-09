"use client"

import * as React from "react"
import { LockIcon } from "lucide-react"

import { BatchToolbar } from "@/components/batch-toolbar"
import { ExportBar } from "@/components/export-bar"
import { PhotoDropzone } from "@/components/photo-dropzone"
import { PhotoGrid } from "@/components/photo-grid"
import { usePhotoStore } from "@/lib/store"

export default function Page() {
  const photos = usePhotoStore((s) => s.photos)
  const addFiles = usePhotoStore((s) => s.addFiles)
  const hydrateCameras = usePhotoStore((s) => s.hydrateCameras)

  React.useEffect(() => {
    hydrateCameras()
  }, [hydrateCameras])

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4 sm:px-6">
      <header className="flex flex-col gap-1.5 py-8 sm:py-12">
        <h1 className="text-[1.75rem] leading-none font-semibold tracking-[-0.02em] text-balance">
          Film EXIF
        </h1>
        <p className="max-w-prose text-[0.95rem] leading-relaxed text-muted-foreground">
          Tag the camera and capture date onto scanned film and phone photos.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <LockIcon className="size-3" />
          Runs entirely in your browser — photos are never uploaded anywhere.
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-6 pb-10">
        {photos.length === 0 ? (
          <PhotoDropzone onFiles={addFiles} />
        ) : (
          <>
            <BatchToolbar />
            <PhotoGrid />
          </>
        )}
      </main>

      <ExportBar />
    </div>
  )
}
