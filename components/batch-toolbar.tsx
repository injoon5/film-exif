"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CameraCombobox } from "@/components/camera-combobox"
import { DateTimeField } from "@/components/date-time-field"
import {
  EXPOSURE_KEYS,
  ExposureFields,
  type ExposureValues,
} from "@/components/exposure-fields"
import { PhotoDropzone } from "@/components/photo-dropzone"
import { useStuck } from "@/hooks/use-stuck"
import { isWritableFormat } from "@/lib/exif"
import { usePhotoStore } from "@/lib/store"
import type { PhotoOverrides } from "@/lib/exif/types"

const APPLIED_HOLD_MS = 1800

const EMPTY_EXPOSURE: ExposureValues = {
  shutterSpeed: null,
  aperture: null,
  iso: null,
  focalLength: null,
  lens: null,
  filmStock: null,
}

export function BatchToolbar() {
  // Primitive selectors only — a per-photo edit rewrites the `photos` array,
  // and subscribing to it here would re-render the whole toolbar on every
  // keystroke in a card.
  const photoCount = usePhotoStore((s) => s.photos.length)
  const writableCount = usePhotoStore(
    (s) => s.photos.filter((p) => isWritableFormat(p.format)).length
  )
  const selectedCount = usePhotoStore((s) => s.selectedIds.size)
  const cameras = usePhotoStore((s) => s.cameras)
  const selectAll = usePhotoStore((s) => s.selectAll)
  const clearSelection = usePhotoStore((s) => s.clearSelection)
  const updateOverrides = usePhotoStore((s) => s.updateOverrides)
  const addCustomCamera = usePhotoStore((s) => s.addCustomCamera)
  const addFiles = usePhotoStore((s) => s.addFiles)

  const [sentinelRef, isStuck] = useStuck<HTMLDivElement>()
  const [cameraId, setCameraId] = React.useState<string | null>(null)
  const [dateTime, setDateTime] = React.useState<string | null>(null)
  const [exposure, setExposure] = React.useState<ExposureValues>(EMPTY_EXPOSURE)
  const [appliedTo, setAppliedTo] = React.useState<number | null>(null)
  const appliedTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (appliedTimer.current) clearTimeout(appliedTimer.current)
    }
  }, [])

  const camera = cameras.find((c) => c.id === cameraId) ?? null
  const allSelected = writableCount > 0 && selectedCount === writableCount

  const patch = React.useMemo(() => {
    const next: Partial<PhotoOverrides> = {}
    if (cameraId) next.cameraId = cameraId
    if (dateTime) next.dateTime = dateTime
    for (const key of EXPOSURE_KEYS) {
      const value = exposure[key]?.trim()
      if (value) next[key] = value
    }
    return next
  }, [cameraId, dateTime, exposure])

  const fieldCount = Object.keys(patch).length
  const canApply = selectedCount > 0 && fieldCount > 0

  function handleApply() {
    if (!canApply) return
    const { selectedIds } = usePhotoStore.getState()
    updateOverrides(Array.from(selectedIds), patch)

    if (appliedTimer.current) clearTimeout(appliedTimer.current)
    setAppliedTo(selectedIds.size)
    appliedTimer.current = setTimeout(() => setAppliedTo(null), APPLIED_HOLD_MS)
  }

  function handleClearFields() {
    setCameraId(null)
    setDateTime(null)
    setExposure(EMPTY_EXPOSURE)
  }

  const applyHint =
    selectedCount === 0
      ? "Select at least one photo first."
      : "Fill in a camera, a date, or any exposure field."

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px" />
      <div
        className={cn(
          "z-30 -mx-4 px-4 py-3 transition-[background-color,border-color,box-shadow] duration-200 sm:sticky sm:top-0 sm:-mx-6 sm:px-6",
          "border-b border-transparent bg-background",
          isStuck &&
            "sm:border-border/60 sm:bg-background/85 sm:backdrop-blur-md sm:supports-backdrop-filter:bg-background/70"
        )}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              <span className="font-medium tabular-nums">{photoCount}</span>
              <span className="text-muted-foreground">
                {" "}
                photo{photoCount === 1 ? "" : "s"}
                {writableCount > 0 && (
                  <>
                    {" · "}
                    <span className="tabular-nums">{selectedCount}</span>{" "}
                    selected
                  </>
                )}
              </span>
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={allSelected ? clearSelection : selectAll}
                disabled={writableCount === 0}
              >
                {allSelected ? "Clear selection" : "Select all"}
              </Button>
              <PhotoDropzone variant="compact" onFiles={addFiles} />
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Camera">
                <CameraCombobox
                  className="w-full sm:w-56"
                  cameras={cameras}
                  value={cameraId}
                  onChange={setCameraId}
                  onAddCustom={addCustomCamera}
                />
              </Field>
              <Field label={<>Date &amp; time taken</>}>
                <DateTimeField
                  value={dateTime}
                  onChange={setDateTime}
                  className="w-full sm:w-64"
                />
              </Field>

              <div className="flex w-full items-center gap-1 sm:ml-auto sm:w-auto">
                {fieldCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 text-muted-foreground hover:text-foreground sm:h-8"
                    onClick={handleClearFields}
                  >
                    Clear
                  </Button>
                )}
                <ApplyButton
                  className="flex-1 sm:flex-none"
                  canApply={canApply}
                  hint={applyHint}
                  selectedCount={selectedCount}
                  appliedTo={appliedTo}
                  onApply={handleApply}
                />
              </div>
            </div>

            <ExposureFields
              idPrefix="batch"
              layout="inline"
              values={exposure}
              onChange={(next) =>
                setExposure((current) => ({ ...current, ...next }))
              }
              camera={camera}
            />
          </div>
        </div>
      </div>
    </>
  )
}

function Field({
  label,
  children,
}: {
  label: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

interface ApplyButtonProps {
  className?: string
  canApply: boolean
  hint: string
  selectedCount: number
  appliedTo: number | null
  onApply: () => void
}

/**
 * `aria-disabled` rather than `disabled`: the button stays hoverable and
 * focusable so the tooltip can explain what's missing instead of leaving a
 * dead control on screen.
 */
function ApplyButton({
  className,
  canApply,
  hint,
  selectedCount,
  appliedTo,
  onApply,
}: ApplyButtonProps) {
  const button = (
    <Button
      // Steps down to a secondary surface instead of a 50%-opacity black slab:
      // "not ready yet" should look quiet, not broken.
      variant={canApply ? "default" : "secondary"}
      aria-disabled={!canApply || undefined}
      onClick={onApply}
      className={cn(
        "h-10 min-w-40 justify-center transition-[colors,scale] sm:h-8",
        canApply
          ? "active:scale-[0.97]"
          : "cursor-not-allowed text-muted-foreground",
        className
      )}
    >
      {appliedTo === null ? (
        // One text node: the button's flex gap would otherwise space out every
        // <span> as if it were an icon.
        <span className="tabular-nums">
          {`Apply to ${selectedCount} ${selectedCount === 1 ? "photo" : "photos"}`}
        </span>
      ) : (
        <span className="flex items-center gap-1.5 motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:fade-in">
          <CheckIcon className="size-4" />
          <span className="tabular-nums">{`Applied to ${appliedTo}`}</span>
        </span>
      )}
    </Button>
  )

  if (canApply) return button

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  )
}
