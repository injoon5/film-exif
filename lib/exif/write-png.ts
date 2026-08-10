import { binaryStringToUint8Array } from "@/lib/binary"
import { buildIfds, hasTagContent } from "@/lib/exif/build"
import { loadPiexif } from "@/lib/exif/piexif"
import type { ResolvedExifEdits } from "@/lib/exif/types"

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

interface PngChunk {
  type: string
  data: Uint8Array<ArrayBuffer>
}

const CRC_TABLE = buildCrcTable()

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function concatUint8Arrays(
  parts: Uint8Array<ArrayBuffer>[]
): Uint8Array<ArrayBuffer> {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function parsePngChunks(bytes: Uint8Array<ArrayBuffer>): PngChunk[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const chunks: PngChunk[] = []
  let offset = 8
  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset)
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7]
    )
    const dataStart = offset + 8
    const data = bytes.slice(dataStart, dataStart + length)
    chunks.push({ type, data })
    offset = dataStart + length + 4 // skip the trailing CRC
  }
  return chunks
}

function serializePngChunks(chunks: PngChunk[]): Uint8Array<ArrayBuffer> {
  const parts: Uint8Array<ArrayBuffer>[] = [Uint8Array.from(PNG_SIGNATURE)]
  for (const chunk of chunks) {
    const typeBytes = Uint8Array.from(
      Array.from(chunk.type, (c) => c.charCodeAt(0))
    )
    const lengthBytes = new Uint8Array(4)
    new DataView(lengthBytes.buffer).setUint32(0, chunk.data.length)

    const crcInput = concatUint8Arrays([typeBytes, chunk.data])
    const crcBytes = new Uint8Array(4)
    new DataView(crcBytes.buffer).setUint32(0, crc32(crcInput))

    parts.push(lengthBytes, typeBytes, chunk.data, crcBytes)
  }
  return concatUint8Arrays(parts)
}

/** Builds the raw TIFF/Exif byte block PNG's `eXIf` chunk expects — the same
 * bytes as a JPEG APP1 segment, minus the 6-byte "Exif\0\0" marker that's
 * only meaningful inside a JPEG. */
async function buildTiffExifBlock(
  edits: ResolvedExifEdits
): Promise<Uint8Array<ArrayBuffer>> {
  const [piexif, { zeroth, exif }] = await Promise.all([
    loadPiexif(),
    buildIfds(edits),
  ])
  const exifBinaryWithJpegMarker = piexif.dump({ "0th": zeroth, Exif: exif })
  return binaryStringToUint8Array(exifBinaryWithJpegMarker.slice(6))
}

/**
 * Splices a spec-compliant `eXIf` ancillary chunk into a PNG, right after
 * `IHDR` (before `PLTE`/`IDAT`, as required by the PNG spec). Pixel data
 * (`IDAT`) is never touched or re-encoded.
 */
export async function writePngExif(
  file: File | Blob,
  edits: ResolvedExifEdits
): Promise<Blob> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  const hasContent = hasTagContent(edits)
  if (!hasContent && !edits.stripGps) {
    return new Blob([buffer], { type: "image/png" })
  }

  const chunks = parsePngChunks(bytes).filter((chunk) => chunk.type !== "eXIf")

  if (hasContent) {
    const ihdrIndex = chunks.findIndex((chunk) => chunk.type === "IHDR")
    const insertAt = ihdrIndex === -1 ? 0 : ihdrIndex + 1
    chunks.splice(insertAt, 0, {
      type: "eXIf",
      data: await buildTiffExifBlock(edits),
    })
  }

  const out = serializePngChunks(chunks)
  return new Blob([out], { type: "image/png" })
}
