import type { HassEntities, HassEntity } from 'home-assistant-js-websocket'
import { describe, expect, it } from 'vitest'
import { sampleHouse } from '../data/sample'
import { allEntityIds, entities } from './entities'
import { applyEntities } from './map'

function entity(entity_id: string, state: string, attributes: Record<string, unknown> = {}): HassEntity {
  return { entity_id, state, attributes, last_changed: '', last_updated: '', context: { id: '', user_id: null, parent_id: null } }
}

function states(...list: HassEntity[]): HassEntities {
  return Object.fromEntries(list.map((e) => [e.entity_id, e]))
}

describe('applyEntities', () => {
  it('leaves sample data alone and counts nothing linked when Home Assistant has none of the entities', () => {
    const { house, linked, total } = applyEntities(sampleHouse, {})
    expect(house).toEqual(sampleHouse)
    expect(linked).toBe(0)
    expect(total).toBe(allEntityIds().length)
  })

  it('reads the thermostat and room sensors', () => {
    const { house, linked } = applyEntities(sampleHouse, states(
      entity(entities.climate.thermostat, 'heat_cool', { temperature: 70, hvac_action: 'cooling', current_humidity: 38, preset_mode: 'away' }),
      entity(entities.climate.rooms.office, '72.6'),
    ))
    expect(house.climate).toMatchObject({ mode: 'Heat cool', setpointF: 70, action: 'Cooling', humidity: 38, comfort: 'Away' })
    expect(house.rooms.find((r) => r.id === 'office')?.tempF).toBe(73)
    expect(linked).toBe(2)
  })

  it('skips unavailable entities instead of showing them', () => {
    const { house, linked } = applyEntities(sampleHouse, states(entity(entities.safety.garage, 'unavailable')))
    expect(house.safety.garage.open).toBe(sampleHouse.safety.garage.open)
    expect(linked).toBe(0)
  })

  it('maps the garage, leaks, TVs and a Roon zone', () => {
    const { house } = applyEntities(sampleHouse, states(
      entity(entities.safety.garage, 'opening'),
      entity(entities.safety.leaks[1], 'on'),
      entity(entities.media.screens.lg, 'on'),
      entity(entities.media.roon['Ayre QX-5'], 'playing', { media_title: 'Freddie Freeloader', volume_level: 0.4, media_position: 30, media_duration: 120 }),
    ))
    expect(house.safety.garage.open).toBe(true)
    expect(house.safety.leaks.map((l) => l.wet)).toEqual([false, true])
    expect(house.media.screens.find((s) => s.id === 'lg')?.on).toBe(true)
    expect(house.media.roon.find((z) => z.name === 'Ayre QX-5')).toMatchObject({ state: 'playing', track: 'Freddie Freeloader', volume: '40', progress: 0.25 })
  })

  it('does not change the state it was given', () => {
    const before = structuredClone(sampleHouse)
    applyEntities(sampleHouse, states(entity(entities.safety.garage, 'open')))
    expect(sampleHouse).toEqual(before)
  })
})
