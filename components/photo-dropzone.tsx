"use client"

import * as React from "react"
import { ImagePlusIcon, UploadIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface PhotoDropzoneProps {
  onFiles: (files: File[]) => void
  variant?: "empty" | "compact"
  className?: string
}

const ACCEPTED_TYPES = "image/*"

export function PhotoDropzone({ onFiles, variant = "empty", className }: PhotoDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = React.useState(false)
  const dragDepth = React.useRef(0)

  function handleFileList(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    onFiles(Array.from(fileList))
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPTED_TYPES}
      multiple
      className="hidden"
      onChange={(event) => {
        handleFileList(event.target.files)
        event.target.value = ""
      }}
    />
  )

  if (variant === "compact") {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} className={className}>
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
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDrop={(event) => {
        event.preventDefault()
        dragDepth.current = 0
        setIsDragActive(false)
        handleFileList(event.dataTransfer.files)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragEnter={(event) => {
        event.preventDefault()
        dragDepth.current += 1
        setIsDragActive(true)
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        dragDepth.current -= 1
        if (dragDepth.current <= 0) {
          dragDepth.current = 0
          setIsDragActive(false)
        }
      }}
      className={cn(
        "flex min-h-72 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center transition-colors duration-150 hover:bg-muted/50",
        isDragActive && "border-foreground/30 bg-muted/60",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border">
        <UploadIcon className="size-5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">Drop your scans here</p>
        <p className="text-sm text-muted-foreground">or tap to choose photos — JPEG and PNG</p>
      </div>
      {input}
    </div>
  )
}
