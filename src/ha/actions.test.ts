import type { HassEntities, HassEntity } from 'home-assistant-js-websocket'
import { describe, expect, it } from 'vitest'
import { sampleHouse } from '../data/sample'
import type { HouseState } from '../data/types'
import { actionCall, serviceCalls } from './actions'
import { entities } from './entities'
import { applyEntities } from './map'

function entity(entity_id: string, state: string, attributes: Record<string, unknown> = {}): HassEntity {
  return { entity_id, state, attributes, last_changed: '', last_updated: '', context: { id: '', user_id: null, parent_id: null } }
}

const states: HassEntities = Object.fromEntries([
  entity('light.lounge_lounge', 'off', { is_hue_group: true }),
  entity('light.lounge_lamp_1', 'off'),
  entity('light.lounge_lamp_2', 'off'),
  entity(entities.media.screens[0].entity, 'off'),
  entity(entities.appliances.waterHeater, 'heat_pump', { away_mode: 'off' }),
  entity(entities.cameras.armed, 'armed_away'),
].map((e) => [e.entity_id, e]))

function change(edit: (h: HouseState) => void) {
  const before = applyEntities(sampleHouse, states).house
  const after = structuredClone(before)
  edit(after)
  return serviceCalls(before, after, states)
}

describe('serviceCalls', () => {
  it('turns a room on through its lights, not the Hue group', () => {
    expect(change((h) => { h.rooms[0].lightsOn = h.rooms[0].lightsTotal })).toEqual([
      { domain: 'light', service: 'turn_on', entityIds: ['light.lounge_lamp_1', 'light.lounge_lamp_2'] },
    ])
  })

  it('turns a TV on, sets water heater vacation and disarms Blink', () => {
    expect(change((h) => {
      h.media.screens[0].on = true
      h.appliances.waterHeater.vacation = true
      h.camerasArmed = false
    })).toEqual([
      { domain: 'media_player', service: 'turn_on', entityIds: [entities.media.screens[0].entity] },
      { domain: 'water_heater', service: 'set_away_mode', data: { away_mode: true }, entityIds: [entities.appliances.waterHeater] },
      { domain: 'alarm_control_panel', service: 'alarm_disarm', entityIds: [entities.cameras.armed] },
    ])
  })

  it('moves both auto-mode targets when the set point changes', () => {
    const auto = { ...states, [entities.climate.thermostat]: entity(entities.climate.thermostat, 'heat_cool', { target_temp_low: 68, target_temp_high: 76, hvac_action: 'heating' }) }
    const before = applyEntities(sampleHouse, auto).house
    const after = structuredClone(before)
    after.climate.setpointF += 1
    expect(serviceCalls(before, after, auto)).toEqual([
      { domain: 'climate', service: 'set_temperature', data: { target_temp_low: 69, target_temp_high: 77 }, entityIds: [entities.climate.thermostat] },
    ])
  })

  it('sends nothing for things Home Assistant does not have yet', () => {
    expect(change((h) => { h.climate.setpointF += 1; h.safety.garage.open = true; h.mode = 'away' })).toEqual([])
  })
})

describe('actionCall', () => {
  it('turns on a scene and turns every light off', () => {
    expect(actionCall({ scene: { id: 'scene.lounge_lounge_vinyl', name: 'Vinyl', room: 'Lounge' } }))
      .toEqual({ domain: 'scene', service: 'turn_on', entityIds: ['scene.lounge_lounge_vinyl'] })
    expect(actionCall({ allLightsOff: true })).toEqual({ domain: 'light', service: 'turn_off', entityIds: ['all'] })
  })
})
