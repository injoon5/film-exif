"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"
import { toast } from "sonner"

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
import { downloadObjectUrl } from "@/lib/download"
import { usePhotoStore } from "@/lib/store"
import type { CameraPreset, PhotoItem, PhotoOverrides } from "@/lib/exif/types"

const EDITOR_BLURB = "Changes apply only when you export this photo."

interface PhotoEditorProps {
  photo: PhotoItem
  /** The control that opens the editor — rendered as the trigger. */
  trigger: React.ReactElement
}

/**
 * The per-photo edit surface, shared by the grid card and the table row: a
 * Popover with room to breathe on desktop, a bottom Drawer on touch.
 */
export function PhotoEditor({ photo, trigger }: PhotoEditorProps) {
  const isMobile = useIsMobile()
  const cameras = usePhotoStore((s) => s.cameras)
  const updateOverrides = usePhotoStore((s) => s.updateOverrides)
  const addCustomCamera = usePhotoStore((s) => s.addCustomCamera)

  const camera = photo.overrides.cameraId
    ? (cameras.find((c) => c.id === photo.overrides.cameraId) ?? null)
    : null

  const fields = (
    <PhotoEditFields
      photo={photo}
      camera={camera}
      cameras={cameras}
      onUpdate={(overrides) => updateOverrides([photo.id], overrides)}
      onAddCustomCamera={addCustomCamera}
    />
  )

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger render={trigger} />
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="truncate font-mono text-sm">
              {photo.name}
            </DrawerTitle>
            <DrawerDescription>{EDITOR_BLURB}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pt-1 pb-2">{fields}</div>
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
    )
  }

  return (
    <Popover>
      <PopoverTrigger render={trigger} />
      <PopoverContent className="w-84" align="start">
        <div className="mb-3 flex flex-col gap-0.5">
          <p
            className="truncate font-mono text-xs font-medium"
            title={photo.name}
          >
            {photo.name}
          </p>
          <p className="text-xs text-muted-foreground">{EDITOR_BLURB}</p>
        </div>
        {fields}
      </PopoverContent>
    </Popover>
  )
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

/** Writes this photo's metadata and hands the browser the result. */
export async function downloadSinglePhoto(id: string): Promise<void> {
  try {
    await usePhotoStore.getState().processPhotos([id])
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
