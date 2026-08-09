# Film EXIF

A small, single-page tool for tagging EXIF metadata — camera and capture date/time — onto scanned film and phone photos. Built for a very specific workflow: disposable/film cameras (e.g. a Kodak FunSaver 800) get scanned by a lab whose minilab scanner stamps its own make/model/date into the file instead of yours, so you fix it up afterwards.

**Everything runs client-side.** Photos are read, edited, and re-downloaded entirely in your browser — nothing is ever uploaded anywhere.

## Features

- Drag-and-drop or tap-to-pick import (JPEG and PNG editable; other formats previewable but read-only for now)
- Per-photo editing (Popover on desktop, bottom Drawer on mobile) or batch-apply to a selection
- Extensible camera picker — built-in presets (Kodak FunSaver 800, iPhone) plus your own custom cameras, saved locally
- Date/time picker built from shadcn's Calendar plus a typed `HH:MM` field (digits auto-advance, arrows step and wrap), with an option to **copy the capture time from another reference photo's EXIF** (time only — never the camera or exposure)
- Optional exposure and lens metadata behind a disclosure: shutter speed, aperture, ISO, focal length, lens model and film stock, all written as proper EXIF rationals
- No location/GPS fields anywhere; an opt-in toggle can strip any GPS data a photo already has
- Download a single photo or a `.zip` of a whole batch

## Stack

- Next.js 16.3 (App Router, static export — `output: "export"`, no server/database)
- shadcn/ui (`base-nova` preset, base-ui primitives) + Tailwind, Inter + Geist Mono
- Zustand for local UI state
- `piexif-ts` for in-place JPEG EXIF rewrites, a small hand-rolled PNG `eXIf` chunk writer, `exifr` for reading, `fflate` for zip export — the two writers are loaded on demand so they stay out of the initial bundle

## Development

```bash
pnpm install
pnpm dev
```

```bash
pnpm build   # static export to ./out
pnpm lint
pnpm typecheck
```
