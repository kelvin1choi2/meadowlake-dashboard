import type { HassEntities, HassEntity } from 'home-assistant-js-websocket'
import { describe, expect, it } from 'vitest'
import { sampleHouse } from '../data/sample'
import { entities } from './entities'
import { applyEntities, nasTask, playersFrom, pulseFrom, scenesFrom, shortTime } from './map'

const now = new Date(2026, 9, 15, 15, 0)

function entity(entity_id: string, state: string, attributes: Record<string, unknown> = {}, changed = now): HassEntity {
  const t = changed.toISOString()
  return { entity_id, state, attributes, last_changed: t, last_updated: t, context: { id: '', user_id: null, parent_id: null } }
}

function states(...list: HassEntity[]): HassEntities {
  return Object.fromEntries(list.map((e) => [e.entity_id, e]))
}

describe('applyEntities', () => {
  it('leaves sample data alone and counts nothing linked when Home Assistant has none of the entities', () => {
    const { house, linked, total } = applyEntities(sampleHouse, {}, now)
    expect(house).toEqual(sampleHouse)
    expect(linked).toBe(0)
    expect(total).toBeGreaterThan(20)
  })

  it('builds rooms from Hue lights, skipping the room group and unreachable bulbs', () => {
    const { house, linked } = applyEntities(sampleHouse, states(
      entity('light.lounge_lounge', 'on', { is_hue_group: true }),
      entity('light.lounge_lamp_1', 'on'),
      entity('light.lounge_lamp_2', 'off'),
      entity('light.lounge_lamp_3', 'unavailable'),
      entity('light.kitchen_kitchen_1', 'off'),
    ), now)
    expect(house.rooms).toEqual([
      { id: 'lounge', name: 'Lounge', occupied: false, lightsOn: 1, lightsTotal: 2 },
      { id: 'kitchen', name: 'Kitchen', occupied: false, lightsOn: 0, lightsTotal: 1 },
    ])
    expect(linked).toBe(2)
  })

  it('reads the thermostat when it is linked', () => {
    const { house } = applyEntities(sampleHouse, states(
      entity(entities.climate.thermostat, 'heat_cool', { current_temperature: 72, temperature: 70, hvac_action: 'cooling', current_humidity: 38 }),
    ), now)
    expect(house.climate).toMatchObject({ mode: 'Auto', currentF: 72, setpointF: 70, action: 'Cooling', humidity: 38, filterDays: undefined })
  })

  it('skips unavailable entities instead of showing them', () => {
    const { house, linked, unavailable } = applyEntities(sampleHouse, states(entity(entities.appliances.waterHeater, 'unavailable', { friendly_name: 'Electric Water Heater' })), now)
    expect(unavailable).toEqual(['Electric Water Heater'])
    expect(house.appliances.waterHeater).toEqual(sampleHouse.appliances.waterHeater)
    expect(linked).toBe(0)
  })

  it('replaces the Roon zones and screens with the real ones', () => {
    const [linn] = entities.media.roon
    const [tv] = entities.media.screens
    const { house } = applyEntities(sampleHouse, states(
      entity(linn.id, 'playing', { media_title: 'Freddie Freeloader', volume_level: 0.4, media_position: 30, media_duration: 120 }),
      entity(tv.entity, 'on'),
    ), now)
    expect(house.media.roon).toEqual([{ name: linn.name, state: 'playing', track: 'Freddie Freeloader', artist: undefined, album: undefined, volume: '40', progress: 0.25 }])
    expect(house.media.screens).toEqual([{ id: tv.id, name: tv.name, tv: true, on: true }])
  })

  it('adds up NAS volumes from used space and percent used', () => {
    const [v1, v2] = entities.nas.volumes
    const { house } = applyEntities(sampleHouse, states(
      entity(v1.usedTB, '4.0'), entity(v1.usedPct, '50'),
      entity(v2.usedTB, '1.0'), entity(v2.usedPct, '25'),
    ), now)
    expect(house.nas.usedTB).toBe(5)
    expect(house.nas.totalTB).toBe(12)
  })

  it('shows camera motion as now, a time today, or nothing', () => {
    const [front, patio] = entities.cameras.list
    const { house } = applyEntities(sampleHouse, states(
      entity(entities.cameras.armed, 'armed_away'),
      entity(front.motion, 'off', {}, new Date(2026, 9, 15, 8, 14)),
      entity(patio.motion, 'off', {}, new Date(2026, 9, 14, 22, 0)),
    ), now)
    expect(house.camerasArmed).toBe(true)
    expect(house.cameras).toEqual([{ name: 'Front door', lastMotion: '8:14a' }, { name: 'Patio', lastMotion: null }])
  })

  it('does not change the state it was given', () => {
    const before = structuredClone(sampleHouse)
    applyEntities(sampleHouse, states(entity('light.lounge_lamp_1', 'on')), now)
    expect(sampleHouse).toEqual(before)
  })
})

describe('weather', () => {
  it('writes Home Assistant conditions in words', () => {
    const { house } = applyEntities(sampleHouse, states(entity(entities.weather, 'partlycloudy', { temperature: 82.4 })), now)
    expect(house.weather).toMatchObject({ condition: 'Partly cloudy', tempF: 82, feelsF: 82 })
  })
})

describe('shortTime', () => {
  it('writes times like the sample data', () => {
    expect(shortTime(new Date(2026, 0, 1, 0, 5))).toBe('12:05a')
    expect(shortTime(new Date(2026, 0, 1, 18, 21))).toBe('6:21p')
  })
})

describe('forecast and sun', () => {
  it('fills the hourly chart, rain note, five days and today’s high and low', () => {
    const hour = (h: number, temperature: number, precipitation_probability = 0) =>
      ({ datetime: new Date(2026, 9, 15, h).toISOString(), temperature, precipitation_probability })
    const day = (d: number, temperature: number, templow: number) =>
      ({ datetime: new Date(2026, 9, d, 12).toISOString(), temperature, templow })
    const { house } = applyEntities(sampleHouse, states(entity(entities.weather, 'sunny', { temperature: 80, wind_speed: 7.6, wind_speed_unit: 'mph', wind_bearing: 315 })), now, {
      hourly: [hour(15, 81), hour(16, 80, 10), hour(17, 78, 45)],
      daily: [15, 16, 17, 18, 19, 20].map((d) => day(d, 85 - d, 70 - d)),
    })
    expect(house.weather.hourly).toEqual([{ label: '3p', tempF: 81 }, { label: '4p', tempF: 80 }, { label: '5p', tempF: 78 }])
    expect(house.weather.rainNote).toBe('45% rain after 5p')
    expect(house.weather.daily).toHaveLength(5)
    expect(house.weather.daily[0]).toEqual({ day: 'Thu', high: 70, low: 55 })
    expect(house.weather).toMatchObject({ high: 70, low: 55, wind: '8 mph NW', aqi: undefined, pollen: undefined })
  })

  it('reads sunrise and sunset from the sun', () => {
    const { house } = applyEntities(sampleHouse, states(entity(entities.sun, 'above_horizon', {
      next_rising: new Date(2026, 9, 16, 7, 24).toISOString(),
      next_setting: new Date(2026, 9, 15, 18, 58).toISOString(),
    })), now)
    expect(house.weather).toMatchObject({ sunrise: '7:24a', sunset: '6:58p' })
  })
})

describe('pulseFrom', () => {
  it("lists today's events newest first and skips older ones", () => {
    const [front, patio] = entities.cameras.list
    const pulse = pulseFrom(states(
      entity(front.motion, 'off', {}, new Date(2026, 9, 15, 8, 14)),
      entity(patio.motion, 'off', {}, new Date(2026, 9, 14, 22, 0)),
      entity(entities.media.roon[0].id, 'playing', { media_title: 'So What' }, new Date(2026, 9, 15, 14, 2)),
      entity('light.lounge_lounge', 'on', { is_hue_group: true }, new Date(2026, 9, 15, 12, 30)),
    ), now)
    expect(pulse).toEqual([
      { category: 'media', who: entities.media.roon[0].name, what: 'playing So What', at: '2:02p' },
      { category: 'inside', who: 'Lounge lights', what: 'on', at: '12:30p' },
      { category: 'outside', who: 'Front door', what: 'motion', at: '8:14a' },
    ])
  })

  it('says the house is quiet when nothing happened today', () => {
    expect(pulseFrom({}, now)).toEqual([{ category: 'inside', who: 'House', what: 'quiet so far today', at: '3:00p' }])
  })
})

describe('plex', () => {
  it('finds the Plex server sensor by its unit and lists its streams', () => {
    const { house } = applyEntities(sampleHouse, states(entity('sensor.mini_plex', '1', {
      unit_of_measurement: 'watching',
      friendly_name: 'Mini Plex',
      'someone - Theater AppleTV': 'Shōgun - S01E04 - The Eightfold Fence',
    })), now)
    expect(house.media.plex).toEqual({ up: true, streams: [{ client: 'Theater AppleTV', title: 'Shōgun - S01E04 - The Eightfold Fence' }], addedThisWeek: undefined })
  })

  it('shows the server as down when its sensor is unavailable', () => {
    const { house } = applyEntities(sampleHouse, states(entity('sensor.mini_plex', 'unavailable', { unit_of_measurement: 'watching' })), now)
    expect(house.media.plex).toMatchObject({ up: false, streams: [] })
  })
})

describe('ecobee, garage and robovac', () => {
  it('uses the active side of an auto-mode set point and the comfort setting', () => {
    const { house } = applyEntities(sampleHouse, states(
      entity(entities.climate.thermostat, 'heat_cool', { current_temperature: 74.4, target_temp_low: 68, target_temp_high: 76, hvac_action: 'cooling' }),
      entity(entities.climate.comfort, 'sleep'),
    ), now)
    expect(house.climate).toMatchObject({ currentF: 74, setpointF: 76, comfort: 'Sleep' })
  })

  it('adds Ecobee temperatures to rooms and makes rooms of unlisted sensors', () => {
    const { house } = applyEntities(sampleHouse, states(
      entity('light.lounge_lamp_1', 'on'),
      entity('sensor.lounge_sensor_temperature', '71.6'),
      entity('binary_sensor.lounge_sensor_occupancy', 'on'),
      entity('sensor.study_sensor_temperature', '69.2', { friendly_name: 'Study Sensor Temperature' }),
      entity('binary_sensor.study_sensor_occupancy', 'off'),
      // SmartThings' copies of the same sensors report presence, not occupancy.
      entity('sensor.lounge_lounge_sensor_temperature', '71.6', { friendly_name: 'Lounge Sensor Temperature' }),
      entity('binary_sensor.lounge_lounge_sensor_presence', 'on'),
    ), now)
    expect(house.rooms).toEqual([
      { id: 'lounge', name: 'Lounge', tempF: 72, occupied: true, lightsOn: 1, lightsTotal: 1 },
      { id: 'study', name: 'Study', tempF: 69, occupied: false, lightsOn: 0, lightsTotal: 0 },
    ])
  })

  it('reads the garage door and robovac', () => {
    const { house } = applyEntities(sampleHouse, states(
      entity(entities.safety.garage, 'open', {}, new Date(2026, 9, 15, 14, 40)),
      entity(entities.chores.vacuum, 'docked', { battery_level: 50 }),
      entity(entities.chores.battery, '96'),
      entity(entities.chores.cleaningTime, '38'),
    ), now)
    expect(house.safety.garage).toEqual({ open: true, since: '2:40p' })
    expect(house.chores.robovac).toMatchObject({ state: 'Docked', battery: 96, lastClean: '38 min', next: undefined })
  })
})

describe('washer and leak sensors', () => {
  const w = entities.appliances.washer

  it('shows a running wash with time left, progress and finish time', () => {
    const { house } = applyEntities(sampleHouse, states(
      entity(w.machine, 'run', {}, new Date(2026, 9, 15, 14, 30)),
      entity(w.job, 'rinse'),
      entity(w.doneAt, new Date(2026, 9, 15, 15, 30).toISOString()),
      entity(w.cycle, 'normal'),
      entity(w.waterTemp, 'warm'),
    ), now)
    expect(house.appliances.washer).toEqual({ state: 'Rinsing', cycle: 'Normal · Warm water', minutesLeft: 30, progress: 0.5, doneAt: '3:30p' })
  })

  it('shows an idle washer with no time left and skips coded cycle names', () => {
    const { house } = applyEntities(sampleHouse, states(
      entity(w.machine, 'stop'),
      entity(w.job, 'none'),
      entity(w.doneAt, new Date(2026, 9, 15, 11, 5).toISOString()),
      entity(w.cycle, 'Table_00_Course_5B'),
    ), now)
    expect(house.appliances.washer).toEqual({ state: 'Idle', cycle: '—', minutesLeft: 0, progress: 0, doneAt: '11:05a' })
  })

  it('shows only leak sensors found in Home Assistant', () => {
    const l = entities.safety.leaks[0]
    const { house } = applyEntities(sampleHouse, states(entity(l.moisture, 'on'), entity(l.battery, '87')), now)
    expect(house.safety.leaks).toEqual([{ name: l.name, wet: true, battery: 87 }])
    expect(pulseFrom(states(entity(l.moisture, 'on')), now)[0]).toMatchObject({ category: 'safety', what: 'wet!' })
  })
})

describe('scenes', () => {
  it('lists every scene by dashboard room, marks favorites in order and keeps never-run scenes', () => {
    const list = scenesFrom(states(
      entity('scene.kitchen_kitchen_bright_kitchen', 'unknown', { group_name: 'Kitchen', name: 'bright kitchen' }),
      entity('scene.lounge_lounge_vinyl', '2026-10-15T20:00:00Z', { group_name: 'Lounge', name: 'Vinyl' }),
      entity('scene.entertaining_relax', 'unknown', { group_name: 'Entertaining', name: 'Relax' }),
      entity('scene.lounge_lounge_bright_lounge', 'unknown', { group_name: 'Lounge', name: 'Bright Lounge' }),
      entity('scene.master_bathroom_master_bathroom_tubbie', 'unknown', { group_name: 'Master Bathroom', name: 'Tubbie' }),
      entity('scene.theater_theater_glow', 'unavailable', { group_name: 'Theater', name: 'Glow' }),
    ))
    expect(list).toEqual([
      { id: 'scene.lounge_lounge_bright_lounge', name: 'Bright Lounge', room: 'Lounge', favorite: 0 },
      { id: 'scene.lounge_lounge_vinyl', name: 'Vinyl', room: 'Lounge', favorite: 1 },
      { id: 'scene.kitchen_kitchen_bright_kitchen', name: 'bright kitchen', room: 'Kitchen', favorite: 4 },
      { id: 'scene.master_bathroom_master_bathroom_tubbie', name: 'Tubbie', room: 'Bath' },
      { id: 'scene.entertaining_relax', name: 'Relax', room: 'Entertaining' },
    ])
  })
})

describe('media players', () => {
  it('lists Roon zones and screens first under dashboard names, then the rest, numbering repeats', () => {
    const list = playersFrom(states(
      entity('media_player.bathroom', 'idle', { friendly_name: 'Bathroom', supported_features: 4 | 8 }),
      entity('media_player.theater_tv_2', 'on', { friendly_name: 'Theater TV', supported_features: 128 | 256 }),
      entity(entities.media.screens[0].entity, 'off', { friendly_name: 'Theater TV' }),
      entity(entities.media.roon[0].id, 'playing', {
        friendly_name: '1 LOUNGE Linn Klimax', supported_features: 1 | 4 | 16 | 32, media_title: 'So What', media_artist: 'Miles Davis',
        volume_level: 0.3, media_position: 30, media_duration: 120, entity_picture: '/api/media_player_proxy/x',
      }),
      entity('media_player.gone', 'unavailable'),
    ))
    expect(list.map((p) => [p.name, p.state])).toEqual([
      [entities.media.roon[0].name, 'playing'],
      ['Theater TV', 'off'],
      ['Bathroom', 'idle'],
      ['Theater TV (2)', 'idle'],
    ])
    expect(list[0]).toMatchObject({
      title: 'So What', subtitle: 'Miles Davis', volume: 0.3, progress: 0.25, art: '/api/media_player_proxy/x',
      can: { pause: true, next: true, previous: true, volume: true, mute: false, power: false },
    })
    expect(list[3].can.power).toBe(true)
  })
})

describe('NAS tasks', () => {
  const t = entities.nas.tasks[0]

  it('reads ok and failed reports with their time and message', () => {
    const failed = entity(t.entity, 'failed: Backup task RoonBackupSMB failed', {}, new Date(2026, 9, 15, 3, 12))
    expect(nasTask(t, failed, now)).toEqual({
      name: t.name, app: t.app, ok: false, when: 'Today 3:12a', detail: 'Backup task RoonBackupSMB failed', reportId: `${t.entity}@${failed.last_changed}`,
    })
    expect(nasTask(t, entity(t.entity, 'ok', {}, new Date(2026, 9, 14, 2, 5)), now)).toMatchObject({ ok: true, when: 'Oct 14 2:05a' })
  })

  it('waits for a first report and replaces the sample tasks once any helper exists', () => {
    expect(nasTask(t, entity(t.entity, ''), now)).toMatchObject({ ok: null, when: 'No report yet' })
    const { house } = applyEntities(sampleHouse, states(entity(t.entity, 'ok: done')), now)
    expect(house.nas.tasks.map((x) => x.name)).toEqual([t.name])
  })
})
