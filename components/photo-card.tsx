"use client"

import * as React from "react"
import {
  CameraIcon,
  CheckIcon,
  DownloadIcon,
  FilmIcon,
  Loader2Icon,
  MapPinOffIcon,
  PencilIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CameraCombobox } from "@/components/camera-combobox"
import { DateTimeField } from "@/components/date-time-field"
import { ExposureFields } from "@/components/exposure-fields"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatInputValueForDisplay } from "@/lib/date"
import { downloadObjectUrl } from "@/lib/download"
import { isWritableFormat } from "@/lib/exif"
import {
  describeExifSummary,
  describeExposureOverrides,
} from "@/lib/exif/describe"
import { usePhoto, usePhotoStore } from "@/lib/store"
import type { CameraPreset, PhotoItem, PhotoOverrides } from "@/lib/exif/types"

interface PhotoCardProps {
  id: string
  index?: number
}

interface PhotoEditFieldsProps {
  photo: PhotoItem
  camera: CameraPreset | null
  cameras: CameraPreset[]
  onUpdate: (overrides: Partial<PhotoOverrides>) => void
  onAddCustomCamera: (make: string, model: string) => CameraPreset
}

function PhotoEditFields({
  photo,
  camera,
  cameras,
  onUpdate,
  onAddCustomCamera,
}: PhotoEditFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Camera</Label>
        <CameraCombobox
          cameras={cameras}
          value={photo.overrides.cameraId}
          onChange={(id) => onUpdate({ cameraId: id })}
          onAddCustom={onAddCustomCamera}
          className="w-full"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Date &amp; time taken</Label>
        <DateTimeField
          value={photo.overrides.dateTime}
          onChange={(value) => onUpdate({ dateTime: value })}
          className="w-full"
        />
      </div>

      <ExposureFields
        idPrefix={photo.id}
        values={photo.overrides}
        onChange={onUpdate}
        original={photo.originalExif}
        camera={camera}
      />

      {photo.originalExif?.hasGps && (
        <label className="-mx-1 flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/60">
          <Checkbox
            checked={photo.overrides.stripGps}
            onCheckedChange={(checked) =>
              onUpdate({ stripGps: checked === true })
            }
          />
          Remove the GPS location this photo carries
        </label>
      )}
    </div>
  )
}

export const PhotoCard = React.memo(function PhotoCard({
  id,
  index = 0,
}: PhotoCardProps) {
  const isMobile = useIsMobile()
  const photo = usePhoto(id)
  const cameras = usePhotoStore((s) => s.cameras)
  // Per-id selector so toggling one checkbox doesn't re-render every card.
  const isSelected = usePhotoStore((s) => s.selectedIds.has(id))
  const toggleSelected = usePhotoStore((s) => s.toggleSelected)
  const removePhoto = usePhotoStore((s) => s.removePhoto)
  const updateOverrides = usePhotoStore((s) => s.updateOverrides)
  const addCustomCamera = usePhotoStore((s) => s.addCustomCamera)
  const processPhotos = usePhotoStore((s) => s.processPhotos)

  if (!photo) return null

  // Left unmemoised on purpose: these are a `find` over a handful of presets
  // and some string joins, and the compiler handles the rest.
  const update = (overrides: Partial<PhotoOverrides>) =>
    updateOverrides([id], overrides)
  const camera = photo.overrides.cameraId
    ? (cameras.find((c) => c.id === photo.overrides.cameraId) ?? null)
    : null
  const originalSummary = describeExifSummary(photo.originalExif)
  const exposureSummary = describeExposureOverrides(photo.overrides)

  const writable = isWritableFormat(photo.format)
  const isBusy = photo.status === "processing"

  async function handleDownloadSingle() {
    try {
      await processPhotos([id])
      const latest = usePhotoStore.getState().photos.find((p) => p.id === id)
      if (!latest?.resultUrl) {
        toast.error(
          latest?.error
            ? `Couldn’t process this photo: ${latest.error}`
            : "Couldn’t process this photo"
        )
        return
      }
      downloadObjectUrl(latest.resultUrl, latest.name)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn’t process this photo"
      )
    }
  }

  const editFields = (
    <PhotoEditFields
      photo={photo}
      camera={camera}
      cameras={cameras}
      onUpdate={update}
      onAddCustomCamera={addCustomCamera}
    />
  )

  return (
    <article
      data-selected={isSelected || undefined}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl bg-card",
        // Selection is the default state for every importable photo, so it
        // gets a slightly darker hairline rather than a ring — a grid of black
        // outlines is noise, and the checkbox already carries the state.
        "shadow-(--card-ring) transition-[box-shadow,translate] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
        "[--card-ring:0_0_0_1px_oklch(0_0_0/0.07),0_1px_2px_oklch(0_0_0/0.04)]",
        "dark:[--card-ring:0_0_0_1px_oklch(1_0_0/0.08)]",
        "data-selected:[--card-ring:0_0_0_1px_oklch(0_0_0/0.24),0_1px_2px_oklch(0_0_0/0.05)]",
        "dark:data-selected:[--card-ring:0_0_0_1px_oklch(1_0_0/0.24)]",
        "sm:hover:-translate-y-px sm:hover:shadow-[var(--card-ring),0_6px_16px_-8px_oklch(0_0_0/0.18)]",
        "dark:sm:hover:shadow-[var(--card-ring),0_6px_16px_-8px_oklch(0_0_0/0.5)]",
        "motion-safe:animate-in motion-safe:fill-mode-backwards motion-safe:fade-in motion-safe:slide-in-from-bottom-2",
        // Offscreen cards in a long roll skip layout and paint entirely.
        "[contain-intrinsic-size:auto_22rem] [content-visibility:auto]"
      )}
      style={{
        animationDelay: `${Math.min(index, 12) * 40}ms`,
        animationDuration: "300ms",
      }}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {photo.previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not optimizable by next/image */}
            <img
              src={photo.previewUrl}
              alt=""
              className="size-full object-cover outline -outline-offset-1 outline-black/10 motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in dark:outline-white/10"
              loading="lazy"
              decoding="async"
            />
            {/* Keeps the controls legible over a blown-out sky. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/25 to-transparent transition-opacity duration-200 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 sm:group-data-selected:opacity-100"
            />
          </>
        ) : (
          <div className="size-full animate-pulse bg-muted" aria-hidden />
        )}

        {writable && (
          <label
            className={cn(
              "absolute top-2 left-2 flex size-8 cursor-pointer items-center justify-center rounded-lg bg-background/85 shadow-sm ring-1 ring-black/10 backdrop-blur-md transition-opacity duration-150 dark:ring-white/15",
              "sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 sm:group-data-selected:opacity-100"
            )}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleSelected(id)}
              aria-label={`${isSelected ? "Deselect" : "Select"} ${photo.name}`}
            />
          </label>
        )}

        <Button
          variant="secondary"
          size="icon-sm"
          className="absolute top-2 right-2 bg-background/85 shadow-sm ring-1 ring-black/10 backdrop-blur-md transition-[opacity,scale] duration-150 hover:bg-background active:scale-[0.96] sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 dark:ring-white/15"
          onClick={() => removePhoto(id)}
          aria-label={`Remove ${photo.name}`}
        >
          <XIcon />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p
          className="truncate font-mono text-xs font-medium"
          title={photo.name}
        >
          {photo.name}
        </p>

        {(camera ||
          photo.overrides.dateTime ||
          exposureSummary ||
          photo.overrides.filmStock?.trim() ||
          !writable ||
          photo.originalExif?.hasGps) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {!writable && (
              <Badge variant="outline" className="text-muted-foreground">
                Not editable yet
              </Badge>
            )}
            {camera && (
              <Badge
                variant="secondary"
                className="max-w-full gap-1"
                title={camera.label}
              >
                <CameraIcon className="size-3 shrink-0" />
                <span className="truncate">{camera.label}</span>
              </Badge>
            )}
            {photo.overrides.dateTime && (
              <Badge variant="secondary" className="font-mono tabular-nums">
                {formatInputValueForDisplay(photo.overrides.dateTime)}
              </Badge>
            )}
            {exposureSummary && (
              <Badge variant="secondary" className="font-mono tabular-nums">
                {exposureSummary}
              </Badge>
            )}
            {photo.overrides.filmStock?.trim() && (
              <Badge
                variant="secondary"
                className="max-w-full gap-1"
                title={photo.overrides.filmStock.trim()}
              >
                <FilmIcon className="size-3 shrink-0" />
                <span className="truncate">
                  {photo.overrides.filmStock.trim()}
                </span>
              </Badge>
            )}
            {photo.originalExif?.hasGps && (
              <Badge
                variant={photo.overrides.stripGps ? "secondary" : "outline"}
                className="gap-1"
              >
                <MapPinOffIcon className="size-3" />
                {photo.overrides.stripGps ? "GPS removed" : "Has GPS"}
              </Badge>
            )}
          </div>
        )}

        {photo.status === "error" ? (
          <p className="flex items-start gap-1.5 text-xs text-destructive">
            <TriangleAlertIcon className="mt-px size-3 shrink-0" />
            {photo.error}
          </p>
        ) : (
          originalSummary && (
            <p
              className="truncate font-mono text-xs text-muted-foreground"
              title={originalSummary}
            >
              {originalSummary}
            </p>
          )
        )}

        <div className="mt-auto flex items-center gap-1 pt-1">
          {writable ? (
            isMobile ? (
              <Drawer>
                <DrawerTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 active:scale-[0.98]"
                    >
                      <PencilIcon />
                      Edit
                    </Button>
                  }
                />
                <DrawerContent>
                  <DrawerHeader className="text-left">
                    <DrawerTitle className="truncate font-mono text-sm">
                      {photo.name}
                    </DrawerTitle>
                    <DrawerDescription>
                      Changes apply only when you export this photo.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="overflow-y-auto px-4 pt-1 pb-2">
                    {editFields}
                  </div>
                  <DrawerFooter>
                    <DrawerClose
                      render={
                        <Button>
                          <CheckIcon />
                          Done
                        </Button>
                      }
                    />
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            ) : (
              <Popover>
                <PopoverTrigger
                  render={
                    <Button variant="outline" size="sm" className="flex-1">
                      <PencilIcon />
                      Edit
                    </Button>
                  }
                />
                <PopoverContent className="w-84" align="start">
                  <div className="mb-3 flex flex-col gap-0.5">
                    <p
                      className="truncate font-mono text-xs font-medium"
                      title={photo.name}
                    >
                      {photo.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Changes apply only when you export this photo.
                    </p>
                  </div>
                  {editFields}
                </PopoverContent>
              </Popover>
            )
          ) : (
            <span className="flex-1 text-xs text-muted-foreground">
              Preview only — export keeps the original untouched.
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground transition-transform hover:text-foreground active:scale-[0.96]"
            onClick={handleDownloadSingle}
            disabled={isBusy}
            aria-label={`Download ${photo.name}`}
          >
            {isBusy ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <DownloadIcon />
            )}
            Download
          </Button>
        </div>
      </div>
    </article>
  )
})
