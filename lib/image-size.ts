/**
 * Reads intrinsic pixel dimensions straight out of a JPEG/PNG header.
 *
 * Worth the ~50 lines: knowing the size up front lets the preview pipeline ask
 * `createImageBitmap` to decode *directly* at thumbnail scale. Decoding a 24MP
 * scan at full size first costs ~96MB of RGBA per photo, and we do several at
 * once.
 */

export interface ImageSize {
  width: number
  height: number
}

const JPEG_SOI = 0xffd8
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** How much of the file to pull in — the SOF/IHDR marker lives near the front. */
export const HEADER_BYTES = 256 * 1024

export function readImageSize(bytes: Uint8Array): ImageSize | null {
  return readPngSize(bytes) ?? readJpegSize(bytes)
}

function readPngSize(bytes: Uint8Array): ImageSize | null {
  if (bytes.length < 24) return null
  if (PNG_SIGNATURE.some((byte, i) => bytes[i] !== byte)) return null

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  // 8-byte signature, then the IHDR chunk: length + type + width + height.
  return size(view.getUint32(16), view.getUint32(20))
}

function readJpegSize(bytes: Uint8Array): ImageSize | null {
  if (bytes.length < 4) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint16(0) !== JPEG_SOI) return null

  let offset = 2
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = bytes[offset + 1]
    // Padding fill bytes, and standalone markers that carry no length field.
    if (marker === 0xff) {
      offset += 1
      continue
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2
      continue
    }

    const length = view.getUint16(offset + 2)
    if (length < 2) return null

    // SOF0-SOF15 carry the frame dimensions; 0xC4/0xC8/0xCC are DHT/JPG/DAC.
    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    if (isStartOfFrame) {
      if (offset + 9 > bytes.length) return null
      return size(view.getUint16(offset + 7), view.getUint16(offset + 5))
    }
    // Start of scan — pixel data from here on, no header left to find.
    if (marker === 0xda) return null

    offset += 2 + length
  }
  return null
}

function size(width: number, height: number): ImageSize | null {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    return null
  return { width, height }
}
