"use client"

import * as React from "react"
import { ImagePlusIcon, UploadIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface PhotoDropzoneProps {
  onFiles: (files: File[]) => void
  variant?: "empty" | "compact"
  /** Driven by the window-wide drop handler so the whole page is a target. */
  isDragActive?: boolean
  className?: string
}

const ACCEPTED_TYPES = "image/*"

export function PhotoDropzone({
  onFiles,
  variant = "empty",
  isDragActive = false,
  className,
}: PhotoDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPTED_TYPES}
      multiple
      className="hidden"
      tabIndex={-1}
      onChange={(event) => {
        const files = Array.from(event.target.files ?? [])
        event.target.value = ""
        if (files.length > 0) onFiles(files)
      }}
    />
  )

  if (variant === "compact") {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className={cn("transition-transform active:scale-[0.96]", className)}
        >
          <ImagePlusIcon />
          Add more
        </Button>
        {input}
      </>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Choose photos"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          inputRef.current?.click()
        }
      }}
      data-drag-active={isDragActive || undefined}
      className={cn(
        "group/dropzone flex min-h-80 w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border bg-muted/25 p-10 text-center",
        "transition-[background-color,border-color,scale] duration-200 ease-[cubic-bezier(0.2,0,0,1)] outline-none",
        "hover:bg-muted/45 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "data-drag-active:scale-[1.005] data-drag-active:border-foreground/40 data-drag-active:bg-muted/70",
        className
      )}
    >
      <div
        className={cn(
          "flex size-14 items-center justify-center rounded-2xl bg-background shadow-sm ring-1 ring-black/5 transition-[scale,rotate] duration-300 ease-[cubic-bezier(0.2,0,0,1)] dark:ring-white/10",
          "group-hover/dropzone:scale-105 group-data-drag-active/dropzone:scale-110 group-data-drag-active/dropzone:-rotate-3"
        )}
      >
        <UploadIcon className="size-5 text-muted-foreground transition-colors group-data-drag-active/dropzone:text-foreground" />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">
          {isDragActive ? "Drop to add them" : "Drop your scans here"}
        </p>
        <p className="max-w-xs text-sm text-pretty text-muted-foreground">
          or click to choose photos — JPEG and PNG can be edited, everything
          else previews
        </p>
      </div>

      {input}
    </div>
  )
}
