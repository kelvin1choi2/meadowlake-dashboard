import { pickups } from '../config/home'
import type { HouseState } from './types'

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** The pickup days as Chores rows, soonest first; today and tomorrow count as soon. */
export function pickupRows(now: Date, list = pickups): HouseState['chores']['upkeep'] {
  return list
    .map((p) => ({ ...p, inDays: (p.day - now.getDay() + 7) % 7 }))
    .sort((a, b) => a.inDays - b.inDays)
    .map((p) => ({
      label: p.what,
      due: p.inDays === 0 ? 'Today' : p.inDays === 1 ? 'Tomorrow' : days[p.day],
      ...(p.inDays <= 1 ? { soon: true } : {}),
    }))
}

/** The house with this week's pickups ahead of the other upkeep rows. */
export function withPickups(house: HouseState, now: Date): HouseState {
  return { ...house, chores: { ...house.chores, upkeep: [...pickupRows(now), ...house.chores.upkeep] } }
}
