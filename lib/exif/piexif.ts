/**
 * piexif-ts is only needed once the user actually exports something, and it's
 * a chunky dependency. Loading it on demand keeps it out of the initial
 * bundle; the promise is cached so the second export doesn't re-import.
 */

type PiexifModule = typeof import("piexif-ts")

let modulePromise: Promise<PiexifModule> | null = null

export function loadPiexif(): Promise<PiexifModule> {
  modulePromise ??= import("piexif-ts").then((piexif) => {
    // Lab scanners and phones sometimes write slightly malformed tag values.
    // Skip the offending tag instead of throwing so one bad tag can't block a
    // whole batch export.
    piexif.setErrorByPass(true)
    return piexif
  })
  return modulePromise
}
