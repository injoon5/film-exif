/**
 * Conversions between the EXIF date/time format ("YYYY:MM:DD HH:MM:SS") and
 * the value used by <input type="datetime-local"> ("YYYY-MM-DDTHH:mm").
 */

export function exifDateTimeToInputValue(
  exifDateTime: string | undefined
): string {
  if (!exifDateTime) return ""
  const match = exifDateTime.match(
    /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
  )
  if (!match) return ""
  const [, year, month, day, hour, minute] = match
  return `${year}-${month}-${day}T${hour}:${minute}`
}

export function inputValueToExifDateTime(
  inputValue: string | null
): string | null {
  if (!inputValue) return null
  const match = inputValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!match) return null
  const [, year, month, day, hour, minute] = match
  return `${year}:${month}:${day} ${hour}:${minute}:00`
}

export function formatExifDateTimeForDisplay(
  exifDateTime: string | undefined
): string | null {
  if (!exifDateTime) return null
  const inputValue = exifDateTimeToInputValue(exifDateTime)
  if (!inputValue) return null
  const date = new Date(inputValue)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

/** Local wall-clock parse of a datetime-local-style value ("YYYY-MM-DDTHH:mm"). */
export function inputValueToDate(inputValue: string | null): Date | undefined {
  if (!inputValue) return undefined
  const match = inputValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!match) return undefined
  const [, year, month, day, hour, minute] = match
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  )
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function inputValueToTimeParts(inputValue: string | null): {
  hour: number
  minute: number
} {
  const match = inputValue?.match(/T(\d{2}):(\d{2})$/)
  if (!match) return { hour: 12, minute: 0 }
  return { hour: Number(match[1]), minute: Number(match[2]) }
}

export function combineDateAndTime(
  date: Date | undefined,
  hour: number,
  minute: number
): string | null {
  if (!date) return null
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:${pad(minute)}`
}

/** Just the clock part, for confirmations where the date is visible elsewhere. */
export function formatTimeOfDay(inputValue: string | null): string | null {
  const date = inputValueToDate(inputValue)
  if (!date) return null
  return date.toLocaleTimeString(undefined, { timeStyle: "short" })
}

export function formatInputValueForDisplay(
  inputValue: string | null
): string | null {
  const date = inputValueToDate(inputValue)
  if (!date) return null
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}
