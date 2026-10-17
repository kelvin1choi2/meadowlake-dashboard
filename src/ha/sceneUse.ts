import type { Connection } from 'home-assistant-js-websocket'
import type { Scene } from '../data/types'
import type { HistoryRows } from './history'

// Which scenes get used most, so the Scenes tile can lead with them. The Hue bridge doesn't
// count scene recalls, but a scene entity's state is the time it last ran, so every run is a
// state change in Home Assistant's recorder (which keeps 10 days by default).

/** How far back to count. Home Assistant's recorder keeps 10 days unless told otherwise. */
export const sceneUseDays = 10

/** How many scenes the tile shows. */
export const sceneSlots = 5

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

/**
 * Picks the tile's scenes: the most used first, ties broken by the hand-picked order in
 * entities.ts, then hand-picked ones to fill any slots left. Returns the scenes with their
 * tile positions (`favorite`) set accordingly.
 */
export function rankByUse(scenes: Scene[], uses: Record<string, number>, slots = sceneSlots): Scene[] {
  const picked = (s: Scene) => s.favorite ?? Infinity
  const used = scenes
    .filter((s) => (uses[s.id] ?? 0) > 0)
    .sort((a, b) => uses[b.id] - uses[a.id] || picked(a) - picked(b) || a.name.localeCompare(b.name))
  const fill = scenes.filter((s) => s.favorite !== undefined && !used.includes(s)).sort((a, b) => picked(a) - picked(b))
  const order = [...used, ...fill].slice(0, slots).map((s) => s.id)
  return scenes.map((s) => {
    const { favorite: _, ...rest } = s
    const at = order.indexOf(s.id)
    return at >= 0 ? { ...rest, favorite: at } : rest
  })
}
