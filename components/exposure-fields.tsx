"use client"

import * as React from "react"
import { Collapsible } from "@base-ui/react/collapsible"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  formatAperture,
  formatFocalLength,
  formatShutterSpeed,
  parseAperture,
  parseFocalLength,
  parseIso,
  parseShutterSpeed,
} from "@/lib/exif/values"
import type {
  CameraPreset,
  ExifSummary,
  PhotoOverrides,
} from "@/lib/exif/types"

export const EXPOSURE_KEYS = [
  "shutterSpeed",
  "aperture",
  "iso",
  "focalLength",
  "lens",
  "filmStock",
] as const

export type ExposureValues = Pick<
  PhotoOverrides,
  (typeof EXPOSURE_KEYS)[number]
>

interface ExposureFieldsProps {
  values: ExposureValues
  onChange: (patch: Partial<ExposureValues>) => void
  /** What the file already contains, shown as placeholders. */
  original?: ExifSummary | null
  camera?: CameraPreset | null
  idPrefix: string
  defaultOpen?: boolean
  /**
   * `stacked` pairs fields up inside the narrow per-photo popover; `inline`
   * sizes each one to its content for the full-width batch toolbar, where
   * stretching "1/125" across 800px would look absurd.
   */
  layout?: "stacked" | "inline"
}

const FIELD_WIDTHS = {
  stacked: { short: "basis-[calc(50%-0.25rem)]", long: "basis-full" },
  inline: { short: "w-28", long: "w-52" },
} as const

/**
 * Number of fields the user has actually filled in — drives the summary chip.
 * Keyed explicitly because callers pass the full `PhotoOverrides` object,
 * which also carries a boolean and the camera/date fields.
 */
export function countExposureValues(values: ExposureValues): number {
  return EXPOSURE_KEYS.filter((key) => Boolean(values[key]?.trim())).length
}

/**
 * Exposure and lens metadata, folded away behind a disclosure. Camera and date
 * are what nearly everyone is here for; these are the fields you reach for once
 * you've got your notebook open, so they shouldn't crowd the common path.
 *
 * Deliberately not part of "copy from another photo" — borrowing a neighbouring
 * frame's clock is safe, borrowing its aperture is a fabrication.
 */
export function ExposureFields({
  values,
  onChange,
  original,
  camera,
  idPrefix,
  defaultOpen = false,
  layout = "stacked",
}: ExposureFieldsProps) {
  const filled = countExposureValues(values)
  const { short, long } = FIELD_WIDTHS[layout]
  // Controlled, and seeded once: a photo that already carries exposure data
  // opens expanded, but filling a field later must not yank the panel around.
  const [open, setOpen] = React.useState(() => defaultOpen || filled > 0)

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger className="group/disclosure -mx-1 flex w-[calc(100%+0.5rem)] items-center gap-1.5 rounded-md px-1 py-1 text-left text-sm font-medium transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
        <ChevronDownIcon className="size-3.5 text-muted-foreground transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] group-data-[panel-open]/disclosure:rotate-180 motion-reduce:transition-none" />
        Exposure &amp; lens
        <span
          className={cn(
            "rounded-full bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums transition-opacity",
            filled > 0 ? "text-muted-foreground opacity-100" : "opacity-0"
          )}
        >
          {filled}
        </span>
      </Collapsible.Trigger>

      <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-250 ease-[cubic-bezier(0.2,0,0,1)] data-[ending-style]:h-0 data-[starting-style]:h-0 motion-reduce:transition-none">
        <div className="flex flex-wrap items-end gap-x-2 gap-y-3 pt-3">
          <ExposureInput
            id={`${idPrefix}-shutter`}
            className={short}
            label="Shutter"
            value={values.shutterSpeed}
            onChange={(shutterSpeed) => onChange({ shutterSpeed })}
            placeholder={formatShutterSpeed(original?.exposureTime) ?? "1/125"}
            invalid={isInvalid(values.shutterSpeed, parseShutterSpeed)}
          />
          <ExposureInput
            id={`${idPrefix}-aperture`}
            className={short}
            label="Aperture"
            value={values.aperture}
            onChange={(aperture) => onChange({ aperture })}
            placeholder={formatAperture(original?.fNumber) ?? "ƒ/8"}
            invalid={isInvalid(values.aperture, parseAperture)}
          />
          <ExposureInput
            id={`${idPrefix}-iso`}
            className={short}
            label="ISO"
            value={values.iso}
            onChange={(iso) => onChange({ iso })}
            inputMode="numeric"
            placeholder={
              original?.iso
                ? String(Math.round(original.iso))
                : (camera?.iso?.toString() ?? "400")
            }
            invalid={isInvalid(values.iso, parseIso)}
          />
          <ExposureInput
            id={`${idPrefix}-focal`}
            className={short}
            label="Focal length"
            value={values.focalLength}
            onChange={(focalLength) => onChange({ focalLength })}
            inputMode="numeric"
            placeholder={formatFocalLength(original?.focalLength) ?? "35mm"}
            invalid={isInvalid(values.focalLength, parseFocalLength)}
          />
          <ExposureInput
            id={`${idPrefix}-lens`}
            label="Lens"
            className={long}
            value={values.lens}
            onChange={(lens) => onChange({ lens })}
            placeholder={original?.lensModel ?? "e.g. Canon FD 50mm f/1.8"}
          />
          <ExposureInput
            id={`${idPrefix}-film`}
            label="Film stock"
            className={long}
            value={values.filmStock}
            onChange={(filmStock) => onChange({ filmStock })}
            placeholder={original?.description ?? "e.g. Portra 400"}
          />
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}

function isInvalid(
  value: string | null,
  parse: (input: string | null) => unknown
): boolean {
  return Boolean(value?.trim()) && parse(value) == null
}

interface ExposureInputProps {
  id: string
  label: string
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  inputMode?: React.ComponentProps<"input">["inputMode"]
  invalid?: boolean
  className?: string
}

function ExposureInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  invalid,
  className,
}: ExposureInputProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={invalid || undefined}
        className="font-mono tabular-nums placeholder:font-sans placeholder:tabular-nums md:text-xs"
      />
    </div>
  )
}
