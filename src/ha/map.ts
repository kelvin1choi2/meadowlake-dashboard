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

const hvacModes: Record<string, string> = { heat: 'Heat', cool: 'Cool', heat_cool: 'Auto', auto: 'Auto', off: 'Off', fan_only: 'Fan' }

function round(n: number | undefined): number | undefined {
  return n === undefined ? undefined : Math.round(n)
}

/** The set point people mean: the single target, or in auto mode the side that's active. */
export function setpoint(t: HassEntity): number | undefined {
  const single = num(t.attributes.temperature)
  if (single !== undefined) return single
  const low = num(t.attributes.target_temp_low)
  const high = num(t.attributes.target_temp_high)
  return t.attributes.hvac_action === 'cooling' ? high ?? low : low ?? high
}

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
): { house: HouseState; linked: number; total: number; unavailable: string[]; onSample: string[] } {
  const h = structuredClone(base)
  let linked = 0
  let total = 0
  /** Names of entities Home Assistant has but reports as unavailable or unknown right now. */
  const unavailable: string[] = []
  /** What the dashboard looked for and Home Assistant doesn't have, so it stays on sample data. */
  const onSample: string[] = []
  /** Looks up an entity and counts it toward "N of M linked". */
  const get = (id: string): HassEntity | undefined => {
    total++
    const e = states[id]
    if (!e) onSample.push(id)
    if (e && offline.has(e.state)) unavailable.push(String(e.attributes.friendly_name ?? id))
    if (!e || offline.has(e.state)) return undefined
    linked++
    return e
  }
  /** Like get, but an unavailable or unknown state still counts as linked and is returned. */
  const getAny = (id: string): HassEntity | undefined => {
    total++
    const e = states[id]
    if (!e) onSample.push(id)
    else linked++
    return e
  }
  const value = (id: string) => {
    const e = get(id)
    return e && num(e.state)
  }

  const t = get(entities.climate.thermostat)
  if (t) {
    h.climate.mode = hvacModes[t.state] ?? label(t.state)
    h.climate.currentF = round(num(t.attributes.current_temperature)) ?? h.climate.currentF
    h.climate.setpointF = round(setpoint(t)) ?? h.climate.setpointF
    const action = str(t.attributes.hvac_action)
    if (action) h.climate.action = label(action)
    h.climate.humidity = round(num(t.attributes.current_humidity)) ?? h.climate.humidity
    const preset = str(t.attributes.preset_mode)
    if (preset) h.climate.comfort = label(preset)
    h.climate.filterDays = undefined
  }
  const comfort = get(entities.climate.comfort)
  if (comfort) h.climate.comfort = label(comfort.state)

  const sensorRoom = (sensor: string) => {
    const temp = states[`sensor.${sensor}_sensor_temperature`]
    const occ = states[`binary_sensor.${sensor}_sensor_occupancy`]
    return {
      tempF: temp && !offline.has(temp.state) ? round(num(temp.state)) : undefined,
      occupied: occ?.state === 'on',
    }
  }
  const rooms = entities.rooms.flatMap((r) => {
    total++
    const lights = roomLights(states, r.lights)
    const sensed = r.sensor ? sensorRoom(r.sensor) : { tempF: undefined, occupied: false }
    if (!lights.length && sensed.tempF === undefined) {
      // Bulbs that are off at the wall show as unavailable rather than missing.
      const known = Object.values(states).some((e) => e.entity_id.startsWith(r.lights) && !isGroup(e))
      if (known) unavailable.push(`${r.name} lights`)
      else onSample.push(`${r.name} room (${r.lights}*)`)
      return []
    }
    linked++
    const lightsOn = lights.filter((e) => e.state === 'on').length
    return [{ id: r.id, name: r.name, ...sensed, lightsOn, lightsTotal: lights.length }]
  })
  const listed = new Set(entities.rooms.map((r) => r.sensor))
  for (const e of Object.values(states)) {
    const sensor = /^sensor\.(.+)_sensor_temperature$/.exec(e.entity_id)?.[1]
    if (!sensor || listed.has(sensor) || offline.has(e.state)) continue
    if (!states[`binary_sensor.${sensor}_sensor_occupancy`]) continue
    total++
    linked++
    const name = String(e.attributes.friendly_name ?? sensor).replace(/ sensor temperature$/i, '')
    rooms.push({ id: sensor, name, ...sensorRoom(sensor), lightsOn: 0, lightsTotal: 0 })
  }
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

  // DSM reports used space and percent used; the size is worked out from the two.
  const volumes = entities.nas.volumes.flatMap((v) => {
    const used = value(v.usedTB)
    const pct = value(v.usedPct)
    if (used === undefined || !pct) return []
    const status = get(v.status)
    return [{
      name: v.name,
      usedTB: Math.round(used * 10) / 10,
      totalTB: Math.round((used / (pct / 100)) * 10) / 10,
      status: status ? label(status.state) : undefined,
    }]
  })
  if (volumes.length) h.nas.volumes = volumes
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

  const tasks = entities.nas.tasks.flatMap((t) => {
    // A helper the NAS hasn't written to yet reads "unknown": that's "No report yet", not a fault.
    const e = getAny(t.entity)
    return e ? [nasTask(t, e, now)] : []
  })
  if (tasks.length) h.nas.tasks = tasks

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
    // Some TVs (the SmartThings Samsung) drop off the network when switched off.
    const p = getAny(s.entity)
    return p ? [{ id: s.id, name: s.name, tv: s.tv, on: !['off', 'standby', ...offline].includes(p.state) }] : []
  })
  if (screens.length) h.media.screens = screens

  const players = playersFrom(states)
  if (players.length) h.media.players = players

  // The Plex server sensor is named after the server, so find it by its unit instead.
  // Its attributes are one entry per stream: "user - device": "title".
  total++
  const plex = Object.values(states).find(
    (e) => e.entity_id.startsWith('sensor.') && String(e.attributes.unit_of_measurement).toLowerCase() === 'watching',
  )
  if (!plex) onSample.push('Plex server (a sensor counting "Watching")')
  if (plex) {
    linked++
    const meta = new Set(['unit_of_measurement', 'friendly_name', 'icon', 'device_class', 'state_class'])
    h.media.plex = {
      up: !offline.has(plex.state),
      streams: offline.has(plex.state)
        ? []
        : Object.entries(plex.attributes)
            .filter(([k, v]) => !meta.has(k) && typeof v === 'string')
            .map(([k, v]) => ({ client: k.split(' - ').at(-1) ?? k, title: v as string })),
      addedThisWeek: undefined,
    }
  }

  const washer = washerFrom(get, now)
  if (washer) h.appliances.washer = washer

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
  if (g) h.safety.garage = { open: g.state !== 'closed', since: shortTime(new Date(g.last_changed)) }

  const vac = get(entities.chores.vacuum)
  if (vac) {
    h.chores.robovac.state = label(vac.state)
    h.chores.robovac.next = undefined
  }
  const battery = value(entities.chores.battery) ?? (vac && num(vac.attributes.battery_level))
  if (battery !== undefined) h.chores.robovac.battery = Math.round(battery)
  const minutes = value(entities.chores.cleaningTime)
  if (minutes !== undefined) h.chores.robovac.lastClean = `${Math.round(minutes)} min`
  const leaks = entities.safety.leaks.flatMap((l) => {
    const s = get(l.moisture)
    if (!s) return []
    const battery = value(l.battery)
    return [{ name: l.name, wet: s.state === 'on', battery: battery === undefined ? undefined : Math.round(battery) }]
  })
  if (leaks.length) h.safety.leaks = leaks

  const found = scenesFrom(states)
  for (const id of entities.scenes.favorites) {
    total++
    if (found.some((s) => s.id === id)) linked++
    else onSample.push(id)
  }
  if (found.length) h.scenes = found

  if (linked) h.pulse = pulseFrom(states, now)

  return { house: h, linked, total, unavailable, onSample }
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Today 3:12a", or "Oct 14 3:12a" for an earlier day. */
function dayTime(d: Date, now: Date): string {
  const day = d.toDateString() === now.toDateString() ? 'Today' : `${months[d.getMonth()]} ${d.getDate()}`
  return `${day} ${shortTime(d)}`
}

/** A task's last result from its text helper: "ok: <message>" or "failed: <message>". */
export function nasTask(t: { name: string; app: string; entity: string }, e: HassEntity, now: Date): HouseState['nas']['tasks'][number] {
  const m = /^(ok|failed)\b:?\s*(.*)$/is.exec(e.state.trim())
  const reportId = `${e.entity_id}@${e.last_changed}`
  if (!m) return { name: t.name, app: t.app, ok: null, when: 'No report yet', reportId }
  return {
    name: t.name,
    app: t.app,
    ok: m[1].toLowerCase() === 'ok',
    when: dayTime(new Date(e.last_changed), now),
    ...(m[2] ? { detail: m[2] } : {}),
    reportId,
  }
}

// Home Assistant's media_player feature flags.
const feature = { pause: 1, volumeSet: 4, mute: 8, previous: 16, next: 32, turnOn: 128, turnOff: 256, volumeStep: 1024, play: 16384 }

/**
 * Every media player Home Assistant can reach, for the playback bar: Roon zones and
 * screens first, under the dashboard's names, then the rest by name. Players that share
 * a name get a number so the picker can tell them apart.
 */
export function playersFrom(states: HassEntities): HouseState['media']['players'] {
  const named = new Map<string, string>([
    ...entities.media.roon.map((z): [string, string] => [z.id, z.name]),
    ...entities.media.screens.map((s): [string, string] => [s.entity, s.name]),
  ])
  const known = [...named.keys()]
  const list = Object.values(states)
    .filter((e) => e.entity_id.startsWith('media_player.') && !offline.has(e.state))
    .map((e) => {
      const a = e.attributes
      const flags = num(a.supported_features) ?? 0
      const has = (f: number) => (flags & f) !== 0
      const pos = num(a.media_position)
      const dur = num(a.media_duration)
      const vl = num(a.volume_level)
      const state = e.state === 'playing' ? 'playing' as const : e.state === 'paused' ? 'paused' as const
        : e.state === 'off' || e.state === 'standby' ? 'off' as const : 'idle' as const
      const player: HouseState['media']['players'][number] = {
        id: e.entity_id,
        name: named.get(e.entity_id) ?? String(a.friendly_name ?? e.entity_id),
        state,
        title: str(a.media_title),
        subtitle: str(a.media_artist) ?? str(a.media_series_title) ?? str(a.app_name),
        art: str(a.entity_picture),
        volume: vl,
        muted: typeof a.is_volume_muted === 'boolean' ? a.is_volume_muted : undefined,
        progress: pos !== undefined && dur ? Math.min(1, pos / dur) : undefined,
        can: {
          pause: has(feature.pause) || has(feature.play),
          next: has(feature.next),
          previous: has(feature.previous),
          volume: has(feature.volumeSet) || has(feature.volumeStep),
          mute: has(feature.mute),
          power: has(feature.turnOn) && has(feature.turnOff),
        },
      }
      return player
    })
  const rank = (p: { id: string }) => { const i = known.indexOf(p.id); return i < 0 ? known.length : i }
  list.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
  const seen = new Map<string, number>()
  for (const p of list) {
    const n = (seen.get(p.name) ?? 0) + 1
    seen.set(p.name, n)
    if (n > 1) p.name = `${p.name} (${n})`
  }
  return list
}

/**
 * Every scene in Home Assistant, ordered by the dashboard's rooms. A scene's state is
 * when it last ran ("unknown" if never), so only "unavailable" means it can't be used.
 * Hue scenes carry their room (group_name) and short name; others use their full name.
 */
export function scenesFrom(states: HassEntities): HouseState['scenes'] {
  const order = entities.rooms.map((r) => ({ prefix: r.lights.replace(/^light\./, 'scene.'), name: r.name }))
  const favorites: string[] = entities.scenes.favorites
  return Object.values(states)
    .filter((e) => e.entity_id.startsWith('scene.') && e.state !== 'unavailable')
    .map((e) => {
      const known = order.findIndex((r) => e.entity_id.startsWith(r.prefix))
      const room = known >= 0 ? order[known].name : str(e.attributes.group_name) ?? 'Other'
      const name = str(e.attributes.name) ?? String(e.attributes.friendly_name ?? e.entity_id)
      const fav = favorites.indexOf(e.entity_id)
      return { scene: { id: e.entity_id, name, room, ...(fav >= 0 ? { favorite: fav } : {}) }, rank: known >= 0 ? known : order.length }
    })
    .sort((a, b) => a.rank - b.rank || a.scene.room.localeCompare(b.scene.room) || a.scene.name.localeCompare(b.scene.name))
    .map((s) => s.scene)
}

const jobs: Record<string, string> = { none: 'Running', wash: 'Washing', rinse: 'Rinsing', spin: 'Spinning', finish: 'Done' }

/** The Samsung washer, from SmartThings' machine state, job state and finish time. */
function washerFrom(get: (id: string) => HassEntity | undefined, now: Date): HouseState['appliances']['washer'] | undefined {
  const w = entities.appliances.washer
  const machine = get(w.machine)
  if (!machine) return undefined
  const job = get(w.job)?.state ?? 'none'
  const doneEntity = get(w.doneAt)
  const done = doneEntity ? new Date(doneEntity.state) : undefined
  const doneOk = done && !Number.isNaN(done.getTime()) ? done : undefined
  const active = machine.state === 'run' || machine.state === 'pause'

  const cycleEntity = get(w.cycle)
  // SmartThings sometimes reports cycles as codes (e.g. Table_00_Course_5B); skip those.
  const cycle = cycleEntity && !/course|table_/i.test(cycleEntity.state) ? label(cycleEntity.state) : undefined
  const temp = get(w.waterTemp)?.state
  const cycleText = [cycle, temp && `${label(temp)} water`].filter(Boolean).join(' · ') || '—'

  if (!active) {
    const finishedToday = doneOk && doneOk <= now && doneOk.toDateString() === now.toDateString()
    return {
      state: job === 'finish' ? 'Done' : 'Idle',
      cycle: cycleText,
      minutesLeft: 0,
      progress: job === 'finish' ? 1 : 0,
      doneAt: finishedToday ? shortTime(doneOk) : '—',
    }
  }
  const left = doneOk ? Math.max(0, Math.ceil((doneOk.getTime() - now.getTime()) / 60000)) : 0
  const started = new Date(machine.last_changed).getTime()
  const span = doneOk ? doneOk.getTime() - started : 0
  const progress = span > 0 ? Math.min(1, Math.max(0, (now.getTime() - started) / span)) : 0
  return {
    state: machine.state === 'pause' ? 'Paused' : jobs[job] ?? label(job),
    cycle: cycleText,
    minutesLeft: left,
    progress,
    doneAt: doneOk ? shortTime(doneOk) : '—',
  }
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
  add(entities.safety.garage, 'safety', 'Garage', (e) => (e.state === 'closed' ? 'closed' : e.state))
  add(entities.chores.vacuum, 'chores', 'Robovac', (e) => (e.state === 'docked' ? 'docked' : e.state))
  add(entities.irrigation.rainDelay, 'outside', 'Rachio', (e) => `rain delay ${e.state}`)
  add(entities.appliances.washer.machine, 'appliances', 'Washer', (e) => ({ run: 'started', pause: 'paused', stop: 'stopped' })[e.state] ?? null)
  for (const l of entities.safety.leaks) add(l.moisture, 'safety', `${l.name} leak sensor`, (e) => (e.state === 'on' ? 'wet!' : 'dry'))
  add(entities.appliances.waterHeater, 'appliances', 'Water heater', (e) => `switched to ${label(e.state).toLowerCase()}`)

  events.sort((a, b) => b.when.getTime() - a.when.getTime())
  const pulse = events.slice(0, 8).map((e) => ({ category: e.category, who: e.who, what: e.what, at: shortTime(e.when) }))
  return pulse.length ? pulse : [{ category: 'inside', who: 'House', what: 'quiet so far today', at: shortTime(now) }]
}
