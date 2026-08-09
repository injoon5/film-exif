import { zip, type AsyncZippable } from "fflate"

export interface ZipEntry {
  name: string
  data: Uint8Array
}

/**
 * Bundles already-processed photos into a single .zip for one-click export.
 * Level 0 (store, no compression) — JPEG/PNG bytes are already compressed,
 * so re-compressing just burns CPU on mobile for no size benefit.
 */
export async function createZip(entries: ZipEntry[]): Promise<Blob> {
  const files: AsyncZippable = {}
  for (const entry of entries) {
    files[entry.name] = [entry.data, { level: 0 }]
  }

  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, { level: 0 }, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })

  // Copy into a dense ArrayBuffer — Blob rejects SharedArrayBuffer-backed views
  // under current DOM typings, and some engines are picky about byteOffset views.
  const copy = new Uint8Array(zipped.byteLength)
  copy.set(zipped)
  return new Blob([copy], { type: "application/zip" })
}

/** Ensures unique file names inside the archive (two "IMG_0001.jpg" would collide). */
export function dedupeFileNames(names: string[]): string[] {
  const seen = new Map<string, number>()
  return names.map((name) => {
    const count = seen.get(name) ?? 0
    seen.set(name, count + 1)
    if (count === 0) return name
    const dotIndex = name.lastIndexOf(".")
    if (dotIndex === -1) return `${name} (${count})`
    return `${name.slice(0, dotIndex)} (${count})${name.slice(dotIndex)}`
  })
}
