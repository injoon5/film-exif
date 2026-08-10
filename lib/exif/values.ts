/**
 * Parsing and display formatting for the exposure fields (shutter speed,
 * aperture, ISO, focal length).
 *
 * The UI keeps whatever the user typed as a plain string; these helpers turn
 * that into the EXIF rationals a writer needs, and turn values read back out
 * of a file into something a photographer recognises ("1/125", "ƒ/2.8").
 * Anything unparseable resolves to `null`, which every writer reads as "leave
 * this tag alone" — a partially typed value can never clobber real metadata.
 */

import type { Rational } from "@/lib/exif/types"

const DECIMAL_PATTERN = /^(\d+)(?:[.,](\d+))?$/
const FRACTION_PATTERN = /^(\d+)\s*\/\s*(\d+)$/

function greatestCommonDivisor(a: number, b: number): number {
  let x = a
  let y = b
  while (y !== 0) {
    const next = x % y
    x = y
    y = next
  }
  return x || 1
}

function toRational(numerator: number, denominator: number): Rational | null {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator))
    return null
  if (numerator <= 0 || denominator <= 0) return null
  const divisor = greatestCommonDivisor(numerator, denominator)
  return [numerator / divisor, denominator / divisor]
}

/** "2.8" -> [14, 5]; "50" -> [50, 1] */
function decimalToRational(text: string): Rational | null {
  const match = DECIMAL_PATTERN.exec(text)
  if (!match) return null
  const [, whole, fraction = ""] = match
  return toRational(Number(`${whole}${fraction}`), 10 ** fraction.length)
}

function clean(input: string | null | undefined): string {
  return (input ?? "").trim().toLowerCase()
}

/** Accepts "1/125", "1/125s", "0.5", "2", `2"`. */
export function parseShutterSpeed(
  input: string | null | undefined
): Rational | null {
  const text = clean(input)
    .replace(/(?:seconds?|secs?|s|")$/, "")
    .trim()
  if (!text) return null

  const fraction = FRACTION_PATTERN.exec(text)
  if (fraction) return toRational(Number(fraction[1]), Number(fraction[2]))

  return decimalToRational(text)
}

/** Accepts "2.8", "f2.8", "f/2.8", "ƒ/2.8". */
export function parseAperture(
  input: string | null | undefined
): Rational | null {
  const text = clean(input)
    .replace(/^[fƒ]\s*\/?\s*/, "")
    .trim()
  if (!text) return null
  return decimalToRational(text)
}

/** Accepts "400", "iso 400", "asa 400". */
export function parseIso(input: string | null | undefined): number | null {
  const text = clean(input)
    .replace(/^(?:iso|asa)\s*/, "")
    .trim()
  if (!/^\d{1,7}$/.test(text)) return null
  const value = Number(text)
  // EXIF stores ISO as a SHORT; anything larger can't round-trip.
  return value > 0 && value <= 65535 ? value : null
}

/** Accepts "35", "35mm", "35 mm". */
export function parseFocalLength(
  input: string | null | undefined
): Rational | null {
  const text = clean(input)
    .replace(/m\s*m$/, "")
    .trim()
  if (!text) return null
  return decimalToRational(text)
}

function trimZeros(value: number): string {
  return String(Number(value.toFixed(2)))
}

/** 0.008 -> "1/125"; 2 -> "2s" */
export function formatShutterSpeed(seconds: number | undefined): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0)
    return null
  if (seconds >= 1) return `${trimZeros(seconds)}s`
  return `1/${Math.round(1 / seconds)}`
}

export function formatAperture(fNumber: number | undefined): string | null {
  if (typeof fNumber !== "number" || !Number.isFinite(fNumber) || fNumber <= 0)
    return null
  return `ƒ/${trimZeros(fNumber)}`
}

export function formatFocalLength(
  millimetres: number | undefined
): string | null {
  if (
    typeof millimetres !== "number" ||
    !Number.isFinite(millimetres) ||
    millimetres <= 0
  ) {
    return null
  }
  return `${trimZeros(millimetres)}mm`
}

export function formatIso(iso: number | undefined): string | null {
  if (typeof iso !== "number" || !Number.isFinite(iso) || iso <= 0) return null
  return `ISO ${Math.round(iso)}`
}
