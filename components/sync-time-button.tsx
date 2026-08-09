"use client"

import * as React from "react"
import { Loader2Icon, RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { exifDateTimeToInputValue } from "@/lib/date"
import { readExifSummary } from "@/lib/exif/read"

interface SyncTimeButtonProps {
  /** Called with a datetime-local value ("YYYY-MM-DDTHH:mm") read from the reference photo. */
  onSync: (value: string) => void
  label?: string
  className?: string
}

/**
 * Lets the user pick a *reference* photo (one that already has the right
 * date/time, e.g. one shot the lab correctly stamped, or a phone photo from
 * the same roll) purely to copy its capture time — never its camera. The
 * reference file itself is read in-memory and discarded.
 */
export function SyncTimeButton({ onSync, label = "Sync time from photo", className }: SyncTimeButtonProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setIsLoading(true)
    try {
      const summary = await readExifSummary(file)
      const value = exifDateTimeToInputValue(summary?.dateTimeOriginal)
      if (!value) {
        toast.error(`No date/time found in "${file.name}"`)
        return
      }
      onSync(value)
      toast.success(`Synced time from "${file.name}"`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={className}
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
      >
        {isLoading ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
        {label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0])
          event.target.value = ""
        }}
      />
    </>
  )
}
