/**
 * Triggers a file download for a Blob. Appends the anchor to the document so
 * Safari/WebKit actually honor the download; revokes the object URL after a
 * delay so the browser has time to start reading it.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.rel = "noopener"
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Same as downloadBlob, but reuses an existing object URL when available. */
export function downloadObjectUrl(url: string, filename: string, revoke = false): void {
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.rel = "noopener"
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  a.remove()
  if (revoke) setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
