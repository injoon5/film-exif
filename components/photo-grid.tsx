"use client"

import { PhotoCard } from "@/components/photo-card"
import { usePhotoStore } from "@/lib/store"

export function PhotoGrid() {
  const photos = usePhotoStore((s) => s.photos)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {photos.map((photo, index) => (
        <PhotoCard key={photo.id} photo={photo} index={index} />
      ))}
    </div>
  )
}
