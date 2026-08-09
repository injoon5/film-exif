"use client"

import * as React from "react"
import { CameraIcon, CheckIcon, Loader2Icon, MapPinOffIcon, PencilIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CameraCombobox } from "@/components/camera-combobox"
import { DateTimeField } from "@/components/date-time-field"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatExifDateTimeForDisplay, formatInputValueForDisplay } from "@/lib/date"
import { isWritableFormat } from "@/lib/exif"
import { usePhotoStore } from "@/lib/store"
import type { CameraPreset, PhotoItem, PhotoOverrides } from "@/lib/exif/types"

interface PhotoCardProps {
  photo: PhotoItem
  index?: number
}

interface PhotoEditFieldsProps {
  photo: PhotoItem
  cameras: CameraPreset[]
  onUpdate: (overrides: Partial<PhotoOverrides>) => void
  onAddCustomCamera: (make: string, model: string) => CameraPreset
}

function PhotoEditFields({ photo, cameras, onUpdate, onAddCustomCamera }: PhotoEditFieldsProps) {
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
        <DateTimeField value={photo.overrides.dateTime} onChange={(value) => onUpdate({ dateTime: value })} />
      </div>
      {photo.originalExif?.hasGps && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={photo.overrides.stripGps}
            onCheckedChange={(checked) => onUpdate({ stripGps: checked === true })}
          />
          Remove existing GPS location
        </label>
      )}
    </div>
  )
}

export function PhotoCard({ photo, index = 0 }: PhotoCardProps) {
  const isMobile = useIsMobile()
  const cameras = usePhotoStore((s) => s.cameras)
  const selectedIds = usePhotoStore((s) => s.selectedIds)
  const toggleSelected = usePhotoStore((s) => s.toggleSelected)
  const removePhoto = usePhotoStore((s) => s.removePhoto)
  const updateOverrides = usePhotoStore((s) => s.updateOverrides)
  const addCustomCamera = usePhotoStore((s) => s.addCustomCamera)
  const processPhotos = usePhotoStore((s) => s.processPhotos)

  const writable = isWritableFormat(photo.format)
  const isSelected = selectedIds.has(photo.id)
  const camera = photo.overrides.cameraId ? cameras.find((c) => c.id === photo.overrides.cameraId) : null
  const originalDate = formatExifDateTimeForDisplay(photo.originalExif?.dateTimeOriginal)

  async function handleDownloadSingle() {
    await processPhotos([photo.id])
    const latest = usePhotoStore.getState().photos.find((p) => p.id === photo.id)
    if (!latest?.resultUrl) {
      toast.error("Couldn't process this photo")
      return
    }
    const a = document.createElement("a")
    a.href = latest.resultUrl
    a.download = latest.name
    a.click()
  }

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-backwards sm:hover:shadow-md"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms`, animationDuration: "300ms" }}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not optimizable by next/image */}
        <img src={photo.previewUrl} alt="" className="size-full object-cover" />

        {writable && (
          <label className="absolute top-1.5 left-1.5 flex size-9 items-center justify-center rounded-md bg-background/90 shadow-sm ring-1 ring-border backdrop-blur-sm">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleSelected(photo.id)}
              aria-label={isSelected ? "Deselect photo" : "Select photo"}
            />
          </label>
        )}

        <Button
          variant="secondary"
          size="icon"
          className="absolute top-1.5 right-1.5 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
          onClick={() => removePhoto(photo.id)}
          aria-label="Remove photo"
        >
          <XIcon />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="truncate font-mono text-[0.8rem] font-medium" title={photo.name}>
          {photo.name}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          {!writable && (
            <Badge variant="outline" className="text-muted-foreground">
              Not editable yet
            </Badge>
          )}
          {camera && (
            <Badge variant="secondary" className="gap-1">
              <CameraIcon className="size-3" />
              {camera.label}
            </Badge>
          )}
          {photo.overrides.dateTime && (
            <Badge variant="secondary" className="font-mono">
              {formatInputValueForDisplay(photo.overrides.dateTime)}
            </Badge>
          )}
          {photo.originalExif?.hasGps && (
            <Badge variant={photo.overrides.stripGps ? "secondary" : "outline"} className="gap-1">
              <MapPinOffIcon className="size-3" />
              {photo.overrides.stripGps ? "GPS will be removed" : "has GPS"}
            </Badge>
          )}
        </div>

        {(photo.originalExif?.make || originalDate) && (
          <p className="font-mono text-[0.7rem] text-muted-foreground">
            {[photo.originalExif?.make, photo.originalExif?.model].filter(Boolean).join(" ") || "—"}
            {originalDate ? ` · ${originalDate}` : ""}
          </p>
        )}

        <div className="mt-auto flex items-center gap-2 pt-1">
          {writable ? (
            isMobile ? (
              <Drawer>
                <DrawerTrigger
                  render={
                    <Button variant="outline" size="sm" className="flex-1">
                      <PencilIcon />
                      Edit
                    </Button>
                  }
                />
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle className="font-mono text-sm">{photo.name}</DrawerTitle>
                    <DrawerDescription>Changes apply only when you export this photo.</DrawerDescription>
                  </DrawerHeader>
                  <div className="px-4 pb-2">
                    <PhotoEditFields
                      photo={photo}
                      cameras={cameras}
                      onUpdate={(overrides) => updateOverrides([photo.id], overrides)}
                      onAddCustomCamera={addCustomCamera}
                    />
                  </div>
                  <DrawerFooter>
                    <DrawerClose render={<Button><CheckIcon />Done</Button>} />
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
                <PopoverContent className="w-80" align="start">
                  <div className="mb-3 flex flex-col gap-0.5">
                    <p className="truncate font-mono text-xs font-medium" title={photo.name}>
                      {photo.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Changes apply only when you export this photo.
                    </p>
                  </div>
                  <PhotoEditFields
                    photo={photo}
                    cameras={cameras}
                    onUpdate={(overrides) => updateOverrides([photo.id], overrides)}
                    onAddCustomCamera={addCustomCamera}
                  />
                </PopoverContent>
              </Popover>
            )
          ) : (
            <span className="flex-1 text-xs text-muted-foreground">
              Preview only — export keeps the original file untouched.
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadSingle}
            disabled={photo.status === "processing"}
          >
            {photo.status === "processing" ? <Loader2Icon className="animate-spin" /> : null}
            Download
          </Button>
        </div>
      </div>
    </div>
  )
}
