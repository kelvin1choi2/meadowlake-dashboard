import type { Connection } from 'home-assistant-js-websocket'
import type { HistoryKey } from '../data/types'
import { entities } from './entities'

// Readings over the last day from Home Assistant's recorder, for the history charts.

/** The entity that holds a chart's readings. Rooms not in entities.rooms use their sensor name as id. */
export function historyEntity(key: HistoryKey): string | undefined {
  if ('hotWater' in key) return entities.appliances.hotWaterPct
  if ('volume' in key) return entities.nas.volumes.find((v) => v.name === key.volume)?.usedPct
  const sensor = entities.rooms.find((r) => r.id === key.room)?.sensor ?? (entities.rooms.some((r) => r.id === key.room) ? undefined : key.room)
  return sensor ? `sensor.${sensor}_sensor_temperature` : undefined
}

/** One entity's rows from history/history_during_period with minimal_response: `s` is the state, `lu` seconds since 1970. */
export type HistoryRows = { s: string; lu?: number; lc?: number }[]

export function historyPoints(rows: HistoryRows): { at: Date; value: number }[] {
  return rows.flatMap((r) => {
    const value = Number.parseFloat(r.s)
    const t = r.lu ?? r.lc
    return Number.isFinite(value) && t !== undefined ? [{ at: new Date(t * 1000), value }] : []
  })
}

export async function fetchHistory(c: Connection, key: HistoryKey, now = new Date()): Promise<{ at: Date; value: number }[] | null> {
  const id = historyEntity(key)
  if (!id) return null
  const result = await c.sendMessagePromise<Record<string, HistoryRows>>({
    type: 'history/history_during_period',
    start_time: new Date(now.getTime() - 24 * 3600_000).toISOString(),
    end_time: now.toISOString(),
    entity_ids: [id],
    minimal_response: true,
    no_attributes: true,
    significant_changes_only: false,
  })
  const points = historyPoints(result[id] ?? [])
  return points.length ? points : null
}
