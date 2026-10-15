import type { HassEntities, HassEntity } from 'home-assistant-js-websocket'
import type { HouseState } from '../data/types'
import { allEntityIds, entities } from './entities'

// Turns Home Assistant entity states into HouseState. Pure, so it's unit tested.
// Anything without a linked entity keeps its current value.

const offline = new Set(['unavailable', 'unknown'])

function usable(states: HassEntities, id: string): HassEntity | undefined {
  const e = states[id]
  return e && !offline.has(e.state) ? e : undefined
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number.parseFloat(v) : Number.NaN
  return Number.isFinite(n) ? n : undefined
}

function label(v: string): string {
  const words = v.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function applyEntities(base: HouseState, states: HassEntities): { house: HouseState; linked: number; total: number } {
  const h = structuredClone(base)
  const ids = allEntityIds()
  const linked = ids.filter((id) => usable(states, id)).length

  const t = usable(states, entities.climate.thermostat)
  if (t) {
    h.climate.mode = label(t.state)
    h.climate.setpointF = num(t.attributes.temperature) ?? h.climate.setpointF
    if (typeof t.attributes.hvac_action === 'string') h.climate.action = label(t.attributes.hvac_action)
    h.climate.humidity = num(t.attributes.current_humidity) ?? h.climate.humidity
    if (typeof t.attributes.preset_mode === 'string') h.climate.comfort = label(t.attributes.preset_mode)
  }

  for (const room of h.rooms) {
    const id = (entities.climate.rooms as Record<string, string>)[room.id]
    const s = id ? usable(states, id) : undefined
    const temp = s && num(s.state)
    if (temp !== undefined) room.tempF = Math.round(temp)
  }

  const w = usable(states, entities.weather)
  if (w) {
    h.weather.condition = label(w.state)
    const temp = num(w.attributes.temperature)
    if (temp !== undefined) h.weather.tempF = Math.round(temp)
  }

  const used = usable(states, entities.nas.volumeUsedTB)
  h.nas.usedTB = (used && num(used.state)) ?? h.nas.usedTB
  const vol = usable(states, entities.nas.volumeStatus)
  if (vol) h.nas.raid = label(vol.state)

  for (const zone of h.media.roon) {
    const id = entities.media.roon[zone.name]
    const p = id ? usable(states, id) : undefined
    if (!p) continue
    zone.state = p.state === 'playing' ? 'playing' : p.state === 'paused' ? 'paused' : 'idle'
    zone.track = typeof p.attributes.media_title === 'string' ? p.attributes.media_title : undefined
    zone.artist = typeof p.attributes.media_artist === 'string' ? p.attributes.media_artist : undefined
    zone.album = typeof p.attributes.media_album_name === 'string' ? p.attributes.media_album_name : undefined
    const vl = num(p.attributes.volume_level)
    zone.volume = vl === undefined ? undefined : String(Math.round(vl * 100))
    const pos = num(p.attributes.media_position)
    const dur = num(p.attributes.media_duration)
    zone.progress = pos !== undefined && dur ? Math.min(1, pos / dur) : undefined
  }

  for (const screen of h.media.screens) {
    const id = entities.media.screens[screen.id]
    const p = id ? usable(states, id) : undefined
    if (p) screen.on = p.state !== 'off' && p.state !== 'standby'
  }

  const wh = usable(states, entities.appliances.waterHeater)
  if (wh) {
    h.appliances.waterHeater.mode = label(wh.state)
    h.appliances.waterHeater.setpointF = num(wh.attributes.temperature) ?? h.appliances.waterHeater.setpointF
    if (typeof wh.attributes.away_mode === 'string') h.appliances.waterHeater.vacation = wh.attributes.away_mode === 'on'
  }

  const g = usable(states, entities.safety.garage)
  if (g) h.safety.garage.open = g.state !== 'closed'

  entities.safety.leaks.forEach((id, i) => {
    const s = usable(states, id)
    if (s && h.safety.leaks[i]) h.safety.leaks[i].wet = s.state === 'on'
  })

  return { house: h, linked, total: ids.length }
}
