import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react'

/**
 * Press-and-hold handlers for an element that also has a tap action. Holding for `ms` runs
 * `onHold`, and the click that follows the release is swallowed so the tap action doesn't run too.
 */
export function useHold(onHold: () => void, ms = 550) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const held = useRef(false)
  const start = useRef<{ x: number; y: number } | null>(null)
  const cancel = () => { clearTimeout(timer.current); start.current = null }
  useEffect(() => cancel, [])
  const handlers = {
    onPointerDown: (e: PointerEvent) => {
      held.current = false
      start.current = { x: e.clientX, y: e.clientY }
      clearTimeout(timer.current)
      timer.current = setTimeout(() => { held.current = true; start.current = null; onHold() }, ms)
    },
    // A finger that starts scrolling isn't holding.
    onPointerMove: (e: PointerEvent) => {
      if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) cancel()
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: MouseEvent) => e.preventDefault(),
  }
  /** Call first thing in the element's onClick; true means the click ended a hold and should do nothing. */
  const wasHeld = () => {
    const was = held.current
    held.current = false
    return was
  }
  return { handlers, wasHeld }
}
