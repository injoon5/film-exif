"use client"

import * as React from "react"
import { CalendarIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { SyncTimeButton } from "@/components/sync-time-button"
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

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

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

  function handleHourChange(nextHour: string | null) {
    if (nextHour === null) return
    onChange(combineDateAndTime(date ?? new Date(), Number(nextHour), minute))
  }

  function handleMinuteChange(nextMinute: string | null) {
    if (nextMinute === null) return
    onChange(combineDateAndTime(date ?? new Date(), hour, Number(nextMinute)))
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button variant="outline" className="justify-start font-normal sm:w-56">
              <CalendarIcon className="text-muted-foreground" />
              <span className={cn("truncate font-mono text-[0.8rem]", !display && "font-sans text-muted-foreground")}>
                {display ?? placeholder}
              </span>
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} onSelect={handleDateSelect} autoFocus />
          <Separator />
          <div className="flex items-center justify-center gap-1.5 p-3">
            <Select value={String(hour)} onValueChange={handleHourChange}>
              <SelectTrigger className="w-[4.5rem] font-mono" aria-label="Hour">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)} className="font-mono">
                    {String(h).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">:</span>
            <Select value={String(minute)} onValueChange={handleMinuteChange}>
              <SelectTrigger className="w-[4.5rem] font-mono" aria-label="Minute">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MINUTES.map((m) => (
                  <SelectItem key={m} value={String(m)} className="font-mono">
                    {String(m).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>

      {value && (
        <Button variant="ghost" size="icon" aria-label="Clear date" onClick={() => onChange(null)}>
          <XIcon />
        </Button>
      )}

      {allowSync && <SyncTimeButton onSync={onChange} label="Sync" />}
    </div>
  )
}
