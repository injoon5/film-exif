"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface TimeFieldProps {
  hour: number
  minute: number
  onChange: (hour: number, minute: number) => void
  className?: string
}

/**
 * A two-segment HH:MM entry field. Numeric inputs rather than 24- and 60-item
 * dropdowns: typing "1330" is one motion, where scrolling a select to :47 is a
 * hunt. Behaves the way the segments of a native date input do — digits
 * auto-advance, arrows step and wrap, backspace walks back.
 */
export function TimeField({
  hour,
  minute,
  onChange,
  className,
}: TimeFieldProps) {
  const hourRef = React.useRef<HTMLInputElement>(null)
  const minuteRef = React.useRef<HTMLInputElement>(null)

  return (
    <div
      className={cn(
        "inline-flex h-8 items-center rounded-lg border border-input bg-transparent px-1 transition-[color,box-shadow,border-color] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        className
      )}
      // Clicking the gap between segments should still land in the field.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault()
          hourRef.current?.focus()
        }
      }}
    >
      <TimeSegment
        ref={hourRef}
        label="Hour"
        value={hour}
        max={23}
        coarseStep={6}
        onCommit={(next) => onChange(next, minute)}
        onNext={() => focusSegment(minuteRef)}
      />
      <span aria-hidden className="px-px text-muted-foreground/70 tabular-nums">
        :
      </span>
      <TimeSegment
        ref={minuteRef}
        label="Minute"
        value={minute}
        max={59}
        coarseStep={10}
        onCommit={(next) => onChange(hour, next)}
        onPrevious={() => focusSegment(hourRef)}
      />
    </div>
  )
}

function focusSegment(ref: React.RefObject<HTMLInputElement | null>): void {
  const input = ref.current
  if (!input) return
  input.focus()
  input.select()
}

interface TimeSegmentProps {
  label: string
  value: number
  max: number
  /** Step used with Shift held — jumps by hours-of-a-quarter-day / ten minutes. */
  coarseStep: number
  onCommit: (value: number) => void
  onNext?: () => void
  onPrevious?: () => void
  ref?: React.Ref<HTMLInputElement>
}

function TimeSegment({
  label,
  value,
  max,
  coarseStep,
  onCommit,
  onNext,
  onPrevious,
  ref,
}: TimeSegmentProps) {
  // Holds the half-typed value ("1" on the way to "13") so the field doesn't
  // fight the user by re-padding between keystrokes.
  const [draft, setDraft] = React.useState<string | null>(null)
  const display = draft ?? String(value).padStart(2, "0")

  function commitDigits(raw: string) {
    // Keep only the last two digits typed, so a full segment rolls ("13" then
    // "5" gives 35) instead of refusing input the way maxLength would.
    let digits = raw.replace(/\D/g, "").slice(-2)

    if (digits === "") {
      setDraft("")
      onCommit(0)
      return
    }
    if (Number(digits) > max) digits = digits.slice(-1)

    const next = Number(digits)
    setDraft(digits)
    onCommit(next)

    // Nothing more can be typed here: either both digits are in, or a second
    // digit could only overshoot (a "7" in a field that stops at 59).
    if (digits.length === 2 || next * 10 > max) {
      setDraft(null)
      onNext?.()
    }
  }

  function step(delta: number) {
    const span = max + 1
    setDraft(null)
    onCommit((((value + delta) % span) + span) % span)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const amount = event.shiftKey ? coarseStep : 1

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault()
        step(amount)
        return
      case "ArrowDown":
        event.preventDefault()
        step(-amount)
        return
      case ":":
      case "Enter":
        if (onNext) {
          event.preventDefault()
          setDraft(null)
          onNext()
        }
        return
      case "ArrowRight":
        if (onNext && input.selectionStart === input.value.length) {
          event.preventDefault()
          onNext()
        }
        return
      case "ArrowLeft":
      case "Backspace":
        if (
          onPrevious &&
          input.selectionStart === 0 &&
          input.selectionEnd === 0
        ) {
          event.preventDefault()
          onPrevious()
        }
        return
    }
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      role="spinbutton"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={display}
      value={display}
      onChange={(event) => commitDigits(event.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={(event) => event.target.select()}
      // Always take the whole segment, focused or not. A caret placed midway
      // through "08" would make the next digit land inside the old value;
      // native date-input segments select themselves on every click too.
      onPointerDown={(event) => {
        event.preventDefault()
        const input = event.currentTarget
        input.focus()
        input.select()
      }}
      onBlur={() => setDraft(null)}
      className="w-[2.25ch] appearance-none rounded-[calc(var(--radius)*0.4)] bg-transparent text-center font-mono text-base tabular-nums caret-transparent outline-none selection:bg-foreground/15 focus:bg-muted md:text-sm"
    />
  )
}
