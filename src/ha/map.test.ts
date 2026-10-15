import type { HassEntities, HassEntity } from 'home-assistant-js-websocket'
import { describe, expect, it } from 'vitest'
import { sampleHouse } from '../data/sample'
import { entities } from './entities'
import { applyEntities, shortTime } from './map'

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
    expect(house.climate).toMatchObject({ mode: 'Heat cool', currentF: 72, setpointF: 70, action: 'Cooling', humidity: 38 })
  })

  it('skips unavailable entities instead of showing them', () => {
    const { house, linked } = applyEntities(sampleHouse, states(entity(entities.appliances.waterHeater, 'unavailable')), now)
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
