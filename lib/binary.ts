/**
 * piexif-ts (like the original piexifjs) operates on JPEG bytes represented as
 * a JS "binary string" — one char per byte, code points 0-255. These helpers
 * convert to/from that representation without hitting call-stack limits on
 * large files (no `String.fromCharCode(...bytes)` spreads).
 */

const latin1Decoder = new TextDecoder("latin1")

export function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
  return latin1Decoder.decode(buffer)
}

export function binaryStringToUint8Array(binary: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function fileToArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
  return file.arrayBuffer()
}
