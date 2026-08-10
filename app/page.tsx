"use client"

import * as React from "react"
import { ImageDownIcon, LockIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { BatchToolbar } from "@/components/batch-toolbar"
import { ExportBar } from "@/components/export-bar"
import { PhotoDropzone } from "@/components/photo-dropzone"
import { PhotoGrid } from "@/components/photo-grid"
import { PhotoTable } from "@/components/photo-table"
import { useWindowFileDrop } from "@/hooks/use-file-drop"
import { isPhotoView } from "@/lib/preferences"
import { usePhotoStore } from "@/lib/store"

export default function Page() {
  const photoCount = usePhotoStore((s) => s.photos.length)
  const addFiles = usePhotoStore((s) => s.addFiles)
  const hydratePreferences = usePhotoStore((s) => s.hydratePreferences)
  const view = usePhotoStore((s) => s.view)
  const setView = usePhotoStore((s) => s.setView)

  React.useEffect(() => {
    hydratePreferences()
  }, [hydratePreferences])

  const isDragging = useWindowFileDrop(addFiles)

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4 sm:px-6">
      <header className="flex flex-col gap-1.5 py-8 sm:py-12">
        <h1 className="text-3xl leading-tight font-semibold tracking-[-0.02em] text-balance">
          Film EXIF
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-pretty text-muted-foreground">
          Tag the camera, capture date, and exposure onto scanned film and phone
          photos.
        </p>
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <LockIcon className="mt-[0.2em] size-3 shrink-0" />
          Runs entirely in your browser — photos are never uploaded anywhere.
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-6 pb-10">
        {photoCount === 0 ? (
          <PhotoDropzone
            onFiles={addFiles}
            isDragActive={isDragging}
            className="flex-1"
          />
        ) : (
          // `contents` keeps the tab root out of the layout: the toolbar and
          // the active panel stay direct children of the flex column.
          <Tabs
            className="contents"
            value={view}
            onValueChange={(next) => {
              if (isPhotoView(next)) setView(next)
            }}
          >
            <BatchToolbar />
            <TabsContent value="grid">
              <PhotoGrid />
            </TabsContent>
            <TabsContent value="table">
              <PhotoTable />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <ExportBar />

      {/* Once the grid is full the page itself is the drop target; this just
          confirms the window will take the drop. */}
      {photoCount > 0 && <DropOverlay show={isDragging} />}
    </div>
  )
}

function DropOverlay({ show }: { show: boolean }) {
  return (
    <div
      aria-hidden={!show}
      className={cn(
        "pointer-events-none fixed inset-3 z-50 flex items-center justify-center rounded-3xl border-2 border-dashed border-foreground/25 bg-background/70 backdrop-blur-sm",
        "transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
        show ? "scale-100 opacity-100" : "scale-[0.99] opacity-0"
      )}
    >
      <p className="flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">
        <ImageDownIcon className="size-4" />
        Drop to add these photos
      </p>
    </div>
  )
}
