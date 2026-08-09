"use client"

import { PhotoCard } from "@/components/photo-card"
import { usePhotoIds } from "@/lib/store"

export function PhotoGrid() {
  // Ids only: editing one photo leaves this list identical, so the grid itself
  // never re-renders and each card decides for itself whether it changed.
  const photoIds = usePhotoIds()

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {photoIds.map((id, index) => (
        <PhotoCard key={id} id={id} index={index} />
      ))}
    </div>
  )
}
