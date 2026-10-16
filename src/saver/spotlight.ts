import type { CategoryId, Tone } from '../data/types'

// Which tile the TV shows big, and for how long. Tiles that need attention stay up longer.

export interface Slot { id: CategoryId; seconds: number }

const dwell: Record<Tone, number> = { neutral: 12, good: 12, warn: 18, bad: 24 }

export function spotlightPlan(tiles: { id: CategoryId; tone: Tone | null }[]): Slot[] {
  return tiles.map((t) => ({ id: t.id, seconds: dwell[t.tone ?? 'neutral'] }))
}

/** The slot after `current`; the first one when `current` has dropped out of the plan. */
export function nextSpotlight(plan: Slot[], current: CategoryId | null): Slot | null {
  if (!plan.length) return null
  const i = plan.findIndex((s) => s.id === current)
  return plan[(i + 1) % plan.length]
}
