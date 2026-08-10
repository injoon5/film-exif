"use client"

import * as React from "react"
import { CheckIcon, ClockArrowDownIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { exifDateTimeToInputValue, formatTimeOfDay } from "@/lib/date"
import { readExifSummary } from "@/lib/exif/read"

interface SyncTimeButtonProps {
  /** Called with a datetime-local value ("YYYY-MM-DDTHH:mm") read from the reference photo. */
  onSync: (value: string) => void
  /**
   * `row` is the labelled, full-width version for the date popover's footer.
   * `icon` is the compact version that sits beside the field itself, so the
   * feature is visible without opening anything first.
   */
  variant?: "row" | "icon"
  className?: string
}

type SyncState = "idle" | "reading" | "done"

const SUCCESS_HOLD_MS = 2400
const LABEL = "Copy time from a photo…"

/**
 * Lets the user pick a *reference* photo (one that already has the right
 * date/time, e.g. one shot the lab correctly stamped, or a phone photo from
 * the same roll) purely to copy its capture time — never its camera or
 * exposure. The reference file itself is read in-memory and discarded.
 *
 * It reports what it did in place rather than through a toast: picking a file,
 * waiting, and landing a value are three states you can watch happen.
 */
export function SyncTimeButton({
  onSync,
  variant = "row",
  className,
}: SyncTimeButtonProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [state, setState] = React.useState<SyncState>("idle")
  const [copied, setCopied] = React.useState<string | null>(null)
  const resetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [])

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (resetTimer.current) clearTimeout(resetTimer.current)
    setState("reading")
    try {
      const summary = await readExifSummary(file)
      const value = exifDateTimeToInputValue(summary?.dateTimeOriginal)
      if (!value) {
        setState("idle")
        toast.error(`No capture time in “${file.name}”`, {
          description: "Pick a photo the camera or phone stamped itself.",
        })
        return
      }

      onSync(value)
      setCopied(formatTimeOfDay(value))
      setState("done")
      resetTimer.current = setTimeout(() => setState("idle"), SUCCESS_HOLD_MS)
    } catch {
      setState("idle")
      toast.error(`Couldn’t read “${file.name}”`)
    }
  }

  const icons = (
    <span className="relative flex size-4 shrink-0 items-center justify-center text-muted-foreground">
      <SwapIcon show={state === "idle"}>
        <ClockArrowDownIcon className="size-4" />
      </SwapIcon>
      <SwapIcon show={state === "reading"}>
        <Loader2Icon className="size-4 animate-spin" />
      </SwapIcon>
      <SwapIcon show={state === "done"}>
        <CheckIcon className="size-4 text-foreground" />
      </SwapIcon>
    </span>
  )

  const picker = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      tabIndex={-1}
      onChange={(event) => {
        void handleFile(event.target.files?.[0])
        event.target.value = ""
      }}
    />
  )

  if (variant === "icon") {
    return (
      <>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                // Outline, not ghost: a bare glyph next to the field reads as
                // decoration, and this is the entry point to a whole feature.
                variant="outline"
                size="icon"
                aria-label={LABEL}
                onClick={() => inputRef.current?.click()}
                disabled={state === "reading"}
                className={cn(
                  "shrink-0 transition-transform active:scale-[0.96] disabled:opacity-100",
                  className
                )}
              >
                {icons}
              </Button>
            }
          />
          <TooltipContent>
            Copy the capture time from another photo
          </TooltipContent>
        </Tooltip>
        {picker}
      </>
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => inputRef.current?.click()}
        disabled={state === "reading"}
        aria-live="polite"
        className={cn(
          "h-9 w-full justify-start gap-2.5 px-2 text-left transition-transform active:scale-[0.96] disabled:opacity-100",
          className
        )}
      >
        {icons}

        {/* Fixed-width stack: the label changes, the button never resizes. */}
        <span className="relative block h-4 min-w-0 flex-1">
          <SwapLabel show={state === "idle"}>{LABEL}</SwapLabel>
          <SwapLabel
            show={state === "reading"}
            className="text-muted-foreground"
          >
            Reading capture time…
          </SwapLabel>
          {/* The date lands visibly on the calendar behind this, so the
              confirmation only needs to name the clock time. */}
          <SwapLabel show={state === "done"}>
            Copied <span className="font-mono tabular-nums">{copied}</span>
          </SwapLabel>
        </span>
      </Button>

      {picker}
    </>
  )
}

/** Cross-fade rather than swap: both icons stay mounted, so the exit animates too. */
function SwapIcon({
  show,
  children,
}: {
  show: boolean
  children: React.ReactNode
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute inset-0 flex items-center justify-center transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
        show
          ? "scale-100 opacity-100 blur-none"
          : "scale-[0.25] opacity-0 blur-[4px]"
      )}
    >
      {children}
    </span>
  )
}

function SwapLabel({
  show,
  className,
  children,
}: {
  show: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      aria-hidden={!show}
      className={cn(
        "absolute inset-y-0 left-0 flex w-full items-center gap-1 overflow-hidden text-sm leading-none whitespace-nowrap transition-[opacity,translate] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
        show
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-1 opacity-0",
        className
      )}
    >
      {children}
    </span>
  )
}
