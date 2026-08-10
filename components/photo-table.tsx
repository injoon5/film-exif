"use client"

import * as React from "react"
import {
  DownloadIcon,
  Loader2Icon,
  MapPinOffIcon,
  PencilIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PhotoEditor, downloadSinglePhoto } from "@/components/photo-editor"
import { formatInputValueForDisplay } from "@/lib/date"
import { isWritableFormat } from "@/lib/exif"
import { describeExposureOverrides } from "@/lib/exif/describe"
import { usePhoto, usePhotoIds, usePhotoStore } from "@/lib/store"

/** Stands in for a column with nothing in it, so rows still scan as a grid. */
const EMPTY = "—"

/**
 * The dense alternative to the card grid: one row per photo, so a whole roll's
 * metadata is legible at a glance and comparable down the column. Columns drop
 * off from the right as the viewport narrows — name and actions always stay.
 */
export function PhotoTable() {
  const photoIds = usePhotoIds()
  const writableCount = usePhotoStore(
    (s) => s.photos.filter((p) => isWritableFormat(p.format)).length
  )
  const selectedCount = usePhotoStore((s) => s.selectedIds.size)
  const selectAll = usePhotoStore((s) => s.selectAll)
  const clearSelection = usePhotoStore((s) => s.clearSelection)

  const allSelected = writableCount > 0 && selectedCount === writableCount

  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-[0_0_0_1px_oklch(0_0_0/0.07)] dark:shadow-[0_0_0_1px_oklch(1_0_0/0.08)]">
      <Table>
        <TableHeader className="[&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 pl-3">
              <Checkbox
                checked={allSelected}
                disabled={writableCount === 0}
                onCheckedChange={() =>
                  allSelected ? clearSelection() : selectAll()
                }
                aria-label={
                  allSelected ? "Deselect all photos" : "Select all photos"
                }
              />
            </TableHead>
            <TableHead className="w-14">Photo</TableHead>
            <TableHead className="min-w-40">Name</TableHead>
            <TableHead className="hidden lg:table-cell">Camera</TableHead>
            <TableHead className="hidden md:table-cell">
              Date &amp; time
            </TableHead>
            <TableHead className="hidden xl:table-cell">Exposure</TableHead>
            <TableHead className="w-px pr-3 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {photoIds.map((id) => (
            <PhotoRow key={id} id={id} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

const PhotoRow = React.memo(function PhotoRow({ id }: { id: string }) {
  const photo = usePhoto(id)
  const cameras = usePhotoStore((s) => s.cameras)
  const isSelected = usePhotoStore((s) => s.selectedIds.has(id))
  const toggleSelected = usePhotoStore((s) => s.toggleSelected)
  const removePhoto = usePhotoStore((s) => s.removePhoto)

  if (!photo) return null

  const camera = photo.overrides.cameraId
    ? (cameras.find((c) => c.id === photo.overrides.cameraId) ?? null)
    : null
  const dateTime = formatInputValueForDisplay(photo.overrides.dateTime)
  const exposure = describeExposureOverrides(photo.overrides)
  const filmStock = photo.overrides.filmStock?.trim()
  const writable = isWritableFormat(photo.format)
  const isBusy = photo.status === "processing"

  return (
    // No selected-row tint: every importable photo starts selected, so tinting
    // would paint the whole table. The checkbox in the same row carries it.
    <TableRow>
      <TableCell className="pl-3">
        {writable && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleSelected(id)}
            aria-label={`${isSelected ? "Deselect" : "Select"} ${photo.name}`}
          />
        )}
      </TableCell>

      <TableCell>
        <div className="size-9 overflow-hidden rounded-md bg-muted">
          {photo.previewUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element -- local blob preview */
            <img
              src={photo.previewUrl}
              alt=""
              className="size-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="size-full animate-pulse" aria-hidden />
          )}
        </div>
      </TableCell>

      <TableCell className="max-w-0">
        <div className="flex min-w-0 flex-col">
          <span
            className="truncate font-mono text-xs font-medium"
            title={photo.name}
          >
            {photo.name}
          </span>
          {photo.status === "error" ? (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <TriangleAlertIcon className="size-3 shrink-0" />
              <span className="truncate">{photo.error}</span>
            </span>
          ) : (
            !writable && (
              <span className="text-xs text-muted-foreground">
                Not editable yet
              </span>
            )
          )}
        </div>
      </TableCell>

      <TableCell className="hidden max-w-0 lg:table-cell">
        <div className="flex min-w-0 flex-col">
          <span
            className={cn(
              "truncate text-xs",
              !camera && "text-muted-foreground"
            )}
            title={camera?.label}
          >
            {camera?.label || EMPTY}
          </span>
          {filmStock && (
            <span
              className="truncate text-xs text-muted-foreground"
              title={filmStock}
            >
              {filmStock}
            </span>
          )}
        </div>
      </TableCell>
      <Value className="hidden font-mono tabular-nums md:table-cell">
        {dateTime}
      </Value>
      <Value className="hidden font-mono tabular-nums xl:table-cell">
        {exposure}
      </Value>

      <TableCell className="pr-3">
        <div className="flex items-center justify-end gap-0.5">
          {photo.originalExif?.hasGps && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center",
                      photo.overrides.stripGps
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <MapPinOffIcon className="size-3.5" />
                  </span>
                }
              />
              <TooltipContent>
                {photo.overrides.stripGps
                  ? "GPS will be removed on export"
                  : "This photo carries a GPS location"}
              </TooltipContent>
            </Tooltip>
          )}

          {writable && (
            <PhotoEditor
              photo={photo}
              trigger={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${photo.name}`}
                >
                  <PencilIcon />
                </Button>
              }
            />
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => void downloadSinglePhoto(id)}
            disabled={isBusy}
            aria-label={`Download ${photo.name}`}
          >
            {isBusy ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <DownloadIcon />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => removePhoto(id)}
            aria-label={`Remove ${photo.name}`}
          >
            <XIcon />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
})

function Value({
  children,
  className,
  title,
}: {
  children?: string | null
  className?: string
  title?: string
}) {
  return (
    <TableCell className={cn("max-w-0", className)}>
      <span
        className={cn(
          "block truncate text-xs",
          !children && "text-muted-foreground"
        )}
        title={title ?? children ?? undefined}
      >
        {children || EMPTY}
      </span>
    </TableCell>
  )
}
