import { useCallback, useState } from 'react'
import { sampleHouse } from './sample'
import type { HouseState } from './types'

export type UpdateHouse = (change: (draft: HouseState) => void) => void

/**
 * The single source of house state for the UI.
 *
 * Today it serves sample data and applies changes locally so every toggle works.
 * When Home Assistant is wired in (see src/ha/), this hook is the one place that
 * swaps sample data for live entities and turns `update` calls into service calls.
 */
export function useHouse(): { house: HouseState; update: UpdateHouse; source: 'sample' | 'live' } {
  const [house, setHouse] = useState<HouseState>(() => structuredClone(sampleHouse))

  const update = useCallback<UpdateHouse>((change) => {
    setHouse((prev) => {
      const next = structuredClone(prev)
      change(next)
      return next
    })
  }, [])

  return { house, update, source: 'sample' }
}
