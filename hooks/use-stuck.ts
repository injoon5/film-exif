"use client"

import * as React from "react"

/**
 * True once a `position: sticky` element has actually stuck to the top.
 *
 * Watches a zero-height sentinel placed just above it rather than listening to
 * scroll, so there's no work on the scroll thread — the border and shadow only
 * appear when the bar is genuinely floating over content.
 */
export function useStuck<T extends HTMLElement>(): [
  React.RefObject<T | null>,
  boolean,
] {
  const sentinelRef = React.useRef<T>(null)
  const [isStuck, setIsStuck] = React.useState(false)

  React.useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || typeof IntersectionObserver === "undefined") return

    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(entry ? !entry.isIntersecting : false),
      { threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  return [sentinelRef, isStuck]
}
