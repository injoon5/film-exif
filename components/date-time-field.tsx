"use client"

import * as React from "react"
import { CalendarIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { SyncTimeButton } from "@/components/sync-time-button"
import { TimeField } from "@/components/time-field"
import {
  combineDateAndTime,
  formatInputValueForDisplay,
  inputValueToDate,
  inputValueToTimeParts,
} from "@/lib/date"

interface DateTimeFieldProps {
  value: string | null
  onChange: (value: string | null) => void
  className?: string
  allowSync?: boolean
  placeholder?: string
}

export function DateTimeField({
  value,
  onChange,
  className,
  allowSync = true,
  placeholder = "Set date & time",
}: DateTimeFieldProps) {
  const [open, setOpen] = React.useState(false)
  const date = inputValueToDate(value)
  const { hour, minute } = inputValueToTimeParts(value)
  const display = formatInputValueForDisplay(value)

  function handleDateSelect(nextDate: Date | undefined) {
    onChange(combineDateAndTime(nextDate, hour, minute))
  }

  function handleTimeChange(nextHour: number, nextMinute: number) {
    onChange(combineDateAndTime(date ?? new Date(), nextHour, nextMinute))
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="min-w-0 flex-1 justify-start font-normal"
            >
              <CalendarIcon className="shrink-0 text-muted-foreground" />
              <span
                className={cn(
                  "truncate font-mono text-xs tabular-nums",
                  !display && "font-sans text-muted-foreground"
                )}
              >
                {display ?? placeholder}
              </span>
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            autoFocus
          />

          <Separator />
          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span className="text-sm text-muted-foreground">Time</span>
            <div className="flex items-center gap-1">
              <TimeField
                hour={hour}
                minute={minute}
                onChange={handleTimeChange}
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  const now = new Date()
                  handleTimeChange(now.getHours(), now.getMinutes())
                }}
              >
                Now
              </Button>
            </div>
          </div>

          {allowSync && (
            <>
              <Separator />
              <div className="p-1.5">
                {/* Left open on purpose: watching the calendar and the time
                    segments jump to the copied value beats a toast. */}
                <SyncTimeButton onSync={onChange} />
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      {/* Also lives in the popover footer, but a feature you have to open a
          date picker to discover may as well not exist — so it gets a
          permanent home next to the field it fills. */}
      {allowSync && <SyncTimeButton variant="icon" onSync={onChange} />}

      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground transition-transform active:scale-[0.96]"
          aria-label="Clear date and time"
          onClick={() => onChange(null)}
        >
          <XIcon />
        </Button>
      )}
    </div>
  )
}
