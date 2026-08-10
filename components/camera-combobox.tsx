"use client"

import * as React from "react"
import { CameraIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
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

/** cmdk needs a non-empty value to highlight the "leave it alone" row. */
const NO_CAMERA = "__none__"

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
  // cmdk highlights whatever it considers active and defaults to the first
  // row. Seeding it with the current camera makes the highlight read as "this
  // is the one you picked" instead of a hover that got stuck.
  const [active, setActive] = React.useState(value ?? NO_CAMERA)

  const selected = cameras.find((c) => c.id === value) ?? null

  function reset() {
    setIsAddingCustom(false)
    setMake("")
    setModel("")
  }

  function choose(id: string | null) {
    onChange(id)
    setActive(id ?? NO_CAMERA)
    setOpen(false)
  }

  function handleAddCustom(event: React.FormEvent) {
    event.preventDefault()
    if (!make.trim() || !model.trim()) return
    const preset = onAddCustom(make.trim(), model.trim())
    choose(preset.id)
    reset()
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setActive(value ?? NO_CAMERA)
        else reset()
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn("w-full justify-between font-normal", className)}
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
            <p className="text-xs text-pretty text-muted-foreground">
              Written to the photo exactly as typed, and saved for next time.
            </p>
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
          <Command value={active} onValueChange={setActive}>
            {/* Always rendered, even for three rows: cmdk routes arrow keys
                and Enter through this input, so without it the list can only
                be used with a mouse. */}
            <CommandInput placeholder="Search cameras…" />
            <CommandList>
              <CommandEmpty>No cameras match.</CommandEmpty>

              {/* Not a camera, so it sits above the heading rather than under it. */}
              <CommandGroup>
                <CommandItem
                  value={NO_CAMERA}
                  keywords={["don't change", "none", "keep"]}
                  data-checked={value === null}
                  onSelect={() => choose(null)}
                >
                  Don’t change
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Cameras">
                {cameras.map((camera) => (
                  <CommandItem
                    key={camera.id}
                    value={camera.id}
                    keywords={[camera.label, camera.make, camera.model]}
                    data-checked={value === camera.id}
                    onSelect={() => choose(camera.id)}
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate">{camera.label}</span>
                      {/* The tag that actually gets written — more use than
                          prose, and it keeps every row the same height. */}
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {camera.make} {camera.model}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup>
                <CommandItem
                  value="__add__"
                  keywords={["add", "custom", "new camera"]}
                  onSelect={() => setIsAddingCustom(true)}
                >
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
