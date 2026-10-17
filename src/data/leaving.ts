import type { HouseState, Player } from './types'

// The one-tap Leaving check: what's still on, and what tapping "Leave" changes.
// The garage door stays out of it, open or not: it's only shown, never moved.

export interface LeavingPlan {
  /** Rooms with lights on, by name. */
  lights: string[]
  /** Screens that are on, by name. */
  screens: string[]
  /** Players that are playing, to pause. */
  players: Player[]
  /** Blink gets armed. */
  arm: boolean
  /** The robovac starts, when it's set to run once everyone leaves and it's docked. */
  vacuum: boolean
  garageOpen: boolean
}

export function leavingPlan(h: HouseState): LeavingPlan {
  const screenNames = new Set(h.media.screens.map((s) => s.name))
  return {
    lights: h.rooms.filter((r) => r.lightsOn > 0).map((r) => r.name),
    screens: h.media.screens.filter((s) => s.on).map((s) => s.name),
    // A TV that's playing is already turned off with the screens.
    players: h.media.players.filter((p) => p.state === 'playing' && p.can.pause && !screenNames.has(p.name)),
    arm: !h.camerasArmed,
    vacuum: h.chores.robovac.runWhenAway && /dock|charg/i.test(h.chores.robovac.state),
    garageOpen: h.safety.garage.open,
  }
}

export const nothingToDo = (p: LeavingPlan) => !p.lights.length && !p.screens.length && !p.players.length && !p.arm && !p.vacuum

/** The on-screen part of leaving: lights and screens off, cameras armed, Away mode. */
export function leave(h: HouseState): void {
  for (const r of h.rooms) r.lightsOn = 0
  for (const s of h.media.screens) s.on = false
  h.camerasArmed = true
  h.mode = 'away'
}
