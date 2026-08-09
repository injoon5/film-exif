"use client"

import * as React from "react"
import { CameraIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CameraPreset } from "@/lib/exif/types"

interface CameraComboboxProps {
  cameras: CameraPreset[]
  value: string | null
  onChange: (id: string | null) => void
  onAddCustom: (make: string, model: string) => CameraPreset
  className?: string
}

export function CameraCombobox({
  cameras,
  value,
  onChange,
  onAddCustom,
  className,
}: CameraComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [isAddingCustom, setIsAddingCustom] = React.useState(false)
  const [make, setMake] = React.useState("")
  const [model, setModel] = React.useState("")

  const selected = cameras.find((c) => c.id === value) ?? null

  function reset() {
    setIsAddingCustom(false)
    setMake("")
    setModel("")
  }

  function handleAddCustom(event: React.FormEvent) {
    event.preventDefault()
    if (!make.trim() || !model.trim()) return
    const preset = onAddCustom(make.trim(), model.trim())
    onChange(preset.id)
    setOpen(false)
    reset()
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between font-normal sm:w-56",
              className
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <CameraIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {selected ? selected.label : "Choose camera"}
              </span>
            </span>
            <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-72 p-0" align="start">
        {isAddingCustom ? (
          <form onSubmit={handleAddCustom} className="flex flex-col gap-3 p-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="camera-make">Make</Label>
              <Input
                id="camera-make"
                autoFocus
                placeholder="e.g. Canon"
                value={make}
                onChange={(e) => setMake(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="camera-model">Model</Label>
              <Input
                id="camera-model"
                placeholder="e.g. AE-1"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingCustom(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!make.trim() || !model.trim()}
              >
                Add camera
              </Button>
            </div>
          </form>
        ) : (
          <Command>
            <CommandList>
              <CommandEmpty>No cameras found.</CommandEmpty>
              <CommandGroup heading="Cameras">
                <CommandItem
                  data-checked={value === null}
                  onSelect={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                >
                  Don’t change
                </CommandItem>
                {cameras.map((camera) => (
                  <CommandItem
                    key={camera.id}
                    data-checked={value === camera.id}
                    onSelect={() => {
                      onChange(camera.id)
                      setOpen(false)
                    }}
                  >
                    <span className="flex flex-col">
                      <span>{camera.label}</span>
                      {camera.note && (
                        <span className="text-xs text-muted-foreground">
                          {camera.note}
                        </span>
                      )}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={() => setIsAddingCustom(true)}>
                  <PlusIcon />
                  Add custom camera
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  )
}
