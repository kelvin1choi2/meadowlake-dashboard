import type { HassEntities, HassEntity } from 'home-assistant-js-websocket'
import type { CategoryId, HouseState } from '../data/types'
import type { ForecastEntry } from './connection'
import { entities } from './entities'

// Turns Home Assistant entity states into HouseState. Pure, so it's unit tested.
// Anything without a linked entity keeps its current (sample) value. Lists that the
// house defines itself (rooms, Roon zones, screens, cameras) are replaced outright
// once any of their entities is found, so sample rooms never mix with real ones.

const offline = new Set(['unavailable', 'unknown'])

function num(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number.parseFloat(v) : Number.NaN
  return Number.isFinite(n) ? n : undefined
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function label(v: string): string {
  const words = v.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// Home Assistant's weather states, in words.
const conditions: Record<string, string> = {
  'clear-night': 'Clear',
  cloudy: 'Cloudy',
  exceptional: 'Severe weather',
  fog: 'Fog',
  hail: 'Hail',
  lightning: 'Lightning',
  'lightning-rainy': 'Thunderstorms',
  partlycloudy: 'Partly cloudy',
  pouring: 'Heavy rain',
  rainy: 'Rain',
  snowy: 'Snow',
  'snowy-rainy': 'Sleet',
  sunny: 'Sunny',
  windy: 'Windy',
  'windy-variant': 'Windy and cloudy',
}

/** "8:14a", matching the sample data's style. */
export function shortTime(d: Date): string {
  const h = d.getHours()
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}${h < 12 ? 'a' : 'p'}`
}

/** "9a", for chart labels. */
function hourLabel(d: Date): string {
  const h = d.getHours()
  return `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`
}

const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

function isGroup(e: HassEntity): boolean {
  const a = e.attributes
  return a.is_hue_group === true || Array.isArray(a.lights) || Array.isArray(a.entity_id)
}

/** A room's Hue lights that are reachable, not counting the room group itself. */
export function roomLights(states: HassEntities, prefix: string): HassEntity[] {
  return Object.values(states).filter((e) => e.entity_id.startsWith(prefix) && !isGroup(e) && !offline.has(e.state))
}

export interface Forecasts {
  hourly?: ForecastEntry[]
  daily?: ForecastEntry[]
}

export function applyEntities(
  base: HouseState,
  states: HassEntities,
  now: Date = new Date(),
  forecasts: Forecasts = {},
): { house: HouseState; linked: number; total: number } {
  const h = structuredClone(base)
  let linked = 0
  let total = 0
  /** Looks up an entity and counts it toward "N of M linked". */
  const get = (id: string): HassEntity | undefined => {
    total++
    const e = states[id]
    if (!e || offline.has(e.state)) return undefined
    linked++
    return e
  }
  const value = (id: string) => {
    const e = get(id)
    return e && num(e.state)
  }

  const t = get(entities.climate.thermostat)
  if (t) {
    h.climate.mode = label(t.state)
    h.climate.currentF = num(t.attributes.current_temperature) ?? h.climate.currentF
    h.climate.setpointF = num(t.attributes.temperature) ?? h.climate.setpointF
    const action = str(t.attributes.hvac_action)
    if (action) h.climate.action = label(action)
    h.climate.humidity = num(t.attributes.current_humidity) ?? h.climate.humidity
    const preset = str(t.attributes.preset_mode)
    if (preset) h.climate.comfort = label(preset)
  }

  const rooms = entities.rooms.flatMap((r) => {
    total++
    const lights = roomLights(states, r.lights)
    if (!lights.length) return []
    linked++
    const lightsOn = lights.filter((e) => e.state === 'on').length
    return [{ id: r.id, name: r.name, occupied: false, lightsOn, lightsTotal: lights.length }]
  })
  if (rooms.length) h.rooms = rooms

  const w = get(entities.weather)
  if (w) {
    h.weather.condition = conditions[w.state] ?? label(w.state)
    const temp = num(w.attributes.temperature)
    if (temp !== undefined) h.weather.tempF = Math.round(temp)
    const feels = num(w.attributes.apparent_temperature)
    h.weather.feelsF = feels === undefined ? h.weather.tempF : Math.round(feels)
    // Nothing in Home Assistant reports these yet, so don't show the sample values.
    h.weather.aqi = undefined
    h.weather.pollen = undefined
    const uv = num(w.attributes.uv_index)
    h.weather.uv = uv === undefined ? undefined : Math.round(uv)
    const speed = num(w.attributes.wind_speed)
    const bearing = num(w.attributes.wind_bearing)
    if (speed !== undefined) {
      const unit = str(w.attributes.wind_speed_unit) ?? 'mph'
      const dir = bearing === undefined ? '' : ` ${compass[Math.round(bearing / 45) % 8]}`
      h.weather.wind = `${Math.round(speed)} ${unit}${dir}`
    }
  }

  const hourly = (forecasts.hourly ?? []).filter((f) => num(f.temperature) !== undefined).slice(0, 13)
  if (hourly.length > 1) {
    h.weather.hourly = hourly.map((f) => ({ label: hourLabel(new Date(f.datetime)), tempF: Math.round(f.temperature!) }))
    const wet = hourly.find((f) => (f.precipitation_probability ?? 0) >= 30)
    h.weather.rainNote = wet ? `${Math.round(wet.precipitation_probability!)}% rain after ${hourLabel(new Date(wet.datetime))}` : 'No rain expected'
  }
  const daily = (forecasts.daily ?? []).filter((f) => num(f.temperature) !== undefined).slice(0, 5)
  if (daily.length) {
    h.weather.daily = daily.map((f) => ({
      day: new Date(f.datetime).toLocaleDateString('en-US', { weekday: 'short' }),
      high: Math.round(f.temperature!),
      low: Math.round(f.templow ?? f.temperature!),
    }))
    h.weather.high = h.weather.daily[0].high
    h.weather.low = h.weather.daily[0].low
  }

  const sun = get(entities.sun)
  if (sun) {
    const rise = str(sun.attributes.next_rising)
    const set = str(sun.attributes.next_setting)
    if (rise) h.weather.sunrise = shortTime(new Date(rise))
    if (set) h.weather.sunset = shortTime(new Date(set))
  }

  const armed = get(entities.cameras.armed)
  if (armed) h.camerasArmed = armed.state.startsWith('armed')
  const cams = entities.cameras.list.flatMap((c) => {
    const m = get(c.motion)
    if (!m) return []
    const changed = new Date(m.last_changed)
    const today = changed.toDateString() === now.toDateString()
    return [{ name: c.name, lastMotion: m.state === 'on' ? 'now' : today ? shortTime(changed) : null }]
  })
  if (cams.length) h.cameras = cams

  const rain = get(entities.irrigation.rainDelay)
  if (rain) h.irrigation.rainSkip = rain.state === 'on'

  let used = 0
  let size = 0
  let volumesFound = 0
  for (const v of entities.nas.volumes) {
    const tb = value(v.usedTB)
    const pct = value(v.usedPct)
    if (tb === undefined || !pct) continue
    used += tb
    size += tb / (pct / 100)
    volumesFound++
  }
  if (volumesFound) {
    h.nas.usedTB = Math.round(used * 10) / 10
    h.nas.totalTB = Math.round(size * 10) / 10
  }
  const vol = get(entities.nas.volumeStatus)
  if (vol) h.nas.raid = label(vol.state)
  h.nas.cpuPct = value(entities.nas.cpuPct) ?? h.nas.cpuPct
  h.nas.ramPct = value(entities.nas.ramPct) ?? h.nas.ramPct
  const drives = entities.nas.drives.flatMap((d) => {
    const temp = value(d.tempC)
    const status = get(d.status)
    if (temp === undefined && !status) return []
    return [{ bay: d.bay, tempC: temp ?? 0, status: status ? label(status.state) : '—' }]
  })
  if (drives.length) h.nas.drives = drives

  const zones = entities.media.roon.flatMap((z) => {
    const p = get(z.id)
    if (!p) return []
    const vl = num(p.attributes.volume_level)
    const pos = num(p.attributes.media_position)
    const dur = num(p.attributes.media_duration)
    return [{
      name: z.name,
      state: p.state === 'playing' ? 'playing' as const : p.state === 'paused' ? 'paused' as const : 'idle' as const,
      track: str(p.attributes.media_title),
      artist: str(p.attributes.media_artist),
      album: str(p.attributes.media_album_name),
      volume: vl === undefined ? undefined : String(Math.round(vl * 100)),
      progress: pos !== undefined && dur ? Math.min(1, pos / dur) : undefined,
    }]
  })
  if (zones.length) h.media.roon = zones

  const screens = entities.media.screens.flatMap((s) => {
    const p = get(s.entity)
    return p ? [{ id: s.id, name: s.name, tv: s.tv, on: p.state !== 'off' && p.state !== 'standby' }] : []
  })
  if (screens.length) h.media.screens = screens

  const wh = get(entities.appliances.waterHeater)
  if (wh) {
    h.appliances.waterHeater.mode = label(wh.state)
    h.appliances.waterHeater.setpointF = num(wh.attributes.temperature) ?? h.appliances.waterHeater.setpointF
    const away = str(wh.attributes.away_mode)
    if (away) h.appliances.waterHeater.vacation = away === 'on'
  }
  const hot = value(entities.appliances.hotWaterPct)
  if (hot !== undefined) h.appliances.waterHeater.availablePct = Math.round(hot)

  const g = get(entities.safety.garage)
  if (g) h.safety.garage.open = g.state !== 'closed'
  entities.safety.leaks.forEach((id, i) => {
    const s = get(id)
    if (s && h.safety.leaks[i]) h.safety.leaks[i].wet = s.state === 'on'
  })

  if (linked) h.pulse = pulseFrom(states, now)

  return { house: h, linked, total }
}

/**
 * Today's notable events for the Pulse ticker, newest first, read from when each
 * tracked entity last changed. Rebuilt on every update, so it needs no history.
 */
export function pulseFrom(states: HassEntities, now: Date): HouseState['pulse'] {
  const events: { category: CategoryId; who: string; what: string; when: Date }[] = []
  const add = (id: string, category: CategoryId, who: string, describe: (e: HassEntity) => string | null) => {
    const e = states[id]
    if (!e || offline.has(e.state)) return
    const when = new Date(e.last_changed)
    if (when.toDateString() !== now.toDateString()) return
    const what = describe(e)
    if (what) events.push({ category, who, what, when })
  }

  for (const c of entities.cameras.list) add(c.motion, 'outside', c.name, (e) => (e.state === 'on' ? 'motion now' : 'motion'))
  add(entities.cameras.armed, 'safety', 'Blink', (e) => (e.state.startsWith('armed') ? 'armed' : 'disarmed'))
  for (const z of entities.media.roon) {
    add(z.id, 'media', z.name, (e) => {
      const title = str(e.attributes.media_title)
      return e.state === 'playing' ? (title ? `playing ${title}` : 'playing') : e.state === 'paused' ? 'paused' : 'stopped'
    })
  }
  for (const s of entities.media.screens) add(s.entity, 'media', s.name, (e) => (e.state === 'off' || e.state === 'standby' ? 'off' : 'on'))
  for (const r of entities.rooms) {
    const group = Object.values(states).find((e) => e.entity_id.startsWith(r.lights) && isGroup(e))
    if (group) add(group.entity_id, 'inside', `${r.name} lights`, (e) => e.state)
  }
  add(entities.irrigation.rainDelay, 'outside', 'Rachio', (e) => `rain delay ${e.state}`)
  add(entities.appliances.waterHeater, 'appliances', 'Water heater', (e) => `switched to ${label(e.state).toLowerCase()}`)

  events.sort((a, b) => b.when.getTime() - a.when.getTime())
  const pulse = events.slice(0, 8).map((e) => ({ category: e.category, who: e.who, what: e.what, at: shortTime(e.when) }))
  return pulse.length ? pulse : [{ category: 'inside', who: 'House', what: 'quiet so far today', at: shortTime(now) }]
}
