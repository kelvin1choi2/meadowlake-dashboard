import type { Connection } from 'home-assistant-js-websocket'
import type { Scene } from '../data/types'
import type { HistoryRows } from './history'

// Which scenes get used most, so each room's card in the Inside sheet can lead with them. The Hue bridge doesn't
// count scene recalls, but a scene entity's state is the time it last ran, so every run is a
// state change in Home Assistant's recorder (which keeps 10 days by default).

/** How far back to count. Home Assistant's recorder keeps 10 days unless told otherwise. */
export const sceneUseDays = 10

/** Times each scene ran, from history/history_during_period rows (one row per run). */
export function countRuns(result: Record<string, HistoryRows>): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const [id, rows] of Object.entries(result)) {
    const n = rows.filter((r) => r.s !== 'unknown' && r.s !== 'unavailable').length
    if (n) counts[id] = n
  }
  return counts
}

export async function fetchSceneUse(c: Connection, ids: string[], now = new Date()): Promise<Record<string, number>> {
  if (!ids.length) return {}
  const result = await c.sendMessagePromise<Record<string, HistoryRows>>({
    type: 'history/history_during_period',
    start_time: new Date(now.getTime() - sceneUseDays * 86400_000).toISOString(),
    end_time: now.toISOString(),
    entity_ids: ids,
    minimal_response: true,
    no_attributes: true,
    significant_changes_only: false,
    // Only runs inside the window; the state at its start is a run from before it.
    include_start_time_state: false,
  })
  return countRuns(result)
}

/** The scenes with how often each ran lately. */
export function withUses(scenes: Scene[], uses: Record<string, number>): Scene[] {
  return scenes.map((s) => ({ ...s, uses: uses[s.id] ?? 0 }))
}

/** How many scene buttons a room shows. */
export const roomSceneSlots = 6

/** A room's scenes for its card: the most used first, then the rest by name. */
export function roomScenes(scenes: Scene[], room: string, slots = roomSceneSlots): Scene[] {
  return scenes
    .filter((s) => s.room === room)
    .sort((a, b) => (b.uses ?? 0) - (a.uses ?? 0) || a.name.localeCompare(b.name))
    .slice(0, slots)
}
