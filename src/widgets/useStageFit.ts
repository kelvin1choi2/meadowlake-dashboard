import { useEffect, useRef, useState } from 'react'
import { fitStage } from './geometry'

/**
 * Scales a stage of fixed width to fit the window. The height is at least `minH`, or the stage's
 * own height when its content is taller, measured as it changes.
 */
export function useStageFit(w: number, minH: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(() => fitStage(window.innerWidth, window.innerHeight, w, minH))
  useEffect(() => {
    const measure = () => {
      const h = Math.max(minH, ref.current?.offsetHeight ?? minH)
      setFit(fitStage(window.innerWidth, window.innerHeight, w, h))
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (ref.current) observer.observe(ref.current)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [w, minH])
  return { ref, fit }
}
