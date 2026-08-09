"use client"

import * as React from "react"

const IMAGE_EXTENSION = /\.(jpe?g|png|heic|heif|webp|tiff?)$/i

function carriesFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files")
}

function imageFiles(list: FileList | undefined | null): File[] {
  return Array.from(list ?? []).filter(
    (file) => file.type.startsWith("image/") || IMAGE_EXTENSION.test(file.name)
  )
}

/**
 * Accepts photo drops anywhere in the window, not just on the dropzone —
 * once the grid fills the screen, aiming at a small target is busywork.
 *
 * Drag enter/leave fire for every element the cursor crosses, so the depth
 * counter is what keeps the highlight from flickering over child elements.
 */
export function useWindowFileDrop(onFiles: (files: File[]) => void): boolean {
  const [isDragging, setIsDragging] = React.useState(false)
  // Latest-callback ref so the window listeners are attached exactly once.
  const handler = React.useRef(onFiles)
  React.useEffect(() => {
    handler.current = onFiles
  }, [onFiles])

  React.useEffect(() => {
    let depth = 0

    function reset() {
      depth = 0
      setIsDragging(false)
    }

    function handleEnter(event: DragEvent) {
      if (!carriesFiles(event)) return
      depth += 1
      setIsDragging(true)
    }

    function handleLeave(event: DragEvent) {
      if (!carriesFiles(event)) return
      depth -= 1
      if (depth <= 0) reset()
    }

    function handleOver(event: DragEvent) {
      if (!carriesFiles(event)) return
      // Without this the browser navigates to the dropped file.
      event.preventDefault()
    }

    function handleDrop(event: DragEvent) {
      if (!carriesFiles(event)) return
      event.preventDefault()
      reset()
      const files = imageFiles(event.dataTransfer?.files)
      if (files.length > 0) handler.current(files)
    }

    window.addEventListener("dragenter", handleEnter)
    window.addEventListener("dragleave", handleLeave)
    window.addEventListener("dragover", handleOver)
    window.addEventListener("drop", handleDrop)
    window.addEventListener("dragend", reset)
    return () => {
      window.removeEventListener("dragenter", handleEnter)
      window.removeEventListener("dragleave", handleLeave)
      window.removeEventListener("dragover", handleOver)
      window.removeEventListener("drop", handleDrop)
      window.removeEventListener("dragend", reset)
    }
  }, [])

  return isDragging
}
