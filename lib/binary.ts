/**
 * piexif-ts (like the original piexifjs) operates on JPEG bytes represented as
 * a JS "binary string" — one char per byte, code points 0-255. These helpers
 * convert to/from that representation without hitting call-stack limits on
 * large files (no `String.fromCharCode(...hugeArray)` spreads).
 *
 * Do NOT use `TextDecoder("latin1")` here. In browsers the "latin1" label is
 * an alias for windows-1252, which remaps bytes 0x80–0x9F to Unicode code
 * points outside 0–255 and corrupts JPEG binary data. Node's "latin1" is a
 * true 1:1 mapping, which is why this only failed in the browser.
 */

const BINARY_CHUNK = 0x8000

export function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  if (bytes.length === 0) return ""

  let out = ""
  for (let i = 0; i < bytes.length; i += BINARY_CHUNK) {
    const end = Math.min(i + BINARY_CHUNK, bytes.length)
    // `subarray` + apply keeps us under the call-stack / arg-count limit.
    out += String.fromCharCode.apply(null, bytes.subarray(i, end) as unknown as number[])
  }
  return out
}

export function binaryStringToUint8Array(binary: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
