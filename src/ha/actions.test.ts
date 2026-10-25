import type { HassEntities, HassEntity } from 'home-assistant-js-websocket'
import { describe, expect, it } from 'vitest'
import { sampleHouse } from '../data/sample'
import type { HouseState, PlayerCommand } from '../data/types'
import { actionCalls, serviceCalls } from './actions'
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
  entity('lock.inside_garage_door', 'locked'),
].map((e) => [e.entity_id, e]))

function change(edit: (h: HouseState) => void) {
  const before = applyEntities(sampleHouse, states).house
  const after = structuredClone(before)
  edit(after)
  return serviceCalls(before, after, states)
}

describe('serviceCalls', () => {
  it('locks and unlocks a door', () => {
    expect(change((h) => { h.safety.locks[0].state = 'unlocked' })).toEqual([{ domain: 'lock', service: 'unlock', entityIds: ['lock.inside_garage_door'] }])
    const unlocked = { ...states, 'lock.inside_garage_door': entity('lock.inside_garage_door', 'unlocked') }
    const before = applyEntities(sampleHouse, unlocked).house
    const after = structuredClone(before)
    after.safety.locks[0].state = 'locked'
    expect(serviceCalls(before, after, unlocked)).toEqual([{ domain: 'lock', service: 'lock', entityIds: ['lock.inside_garage_door'] }])
  })

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

  it('dims a room, and switches it off without dimming it', () => {
    const lit = { ...states, 'light.lounge_lamp_1': entity('light.lounge_lamp_1', 'on', { brightness: 128 }) }
    const before = applyEntities(sampleHouse, lit).house
    expect(before.rooms[0].brightness).toBe(50)
    const dim = structuredClone(before)
    dim.rooms[0].brightness = 20
    expect(serviceCalls(before, dim, lit)).toEqual([
      { domain: 'light', service: 'turn_on', data: { brightness_pct: 20 }, entityIds: ['light.lounge_lamp_1', 'light.lounge_lamp_2'] },
    ])
    const off = structuredClone(before)
    off.rooms[0].brightness = 20
    off.rooms[0].lightsOn = 0
    expect(serviceCalls(before, off, lit)).toEqual([{ domain: 'light', service: 'turn_off', entityIds: ['light.lounge_lamp_1', 'light.lounge_lamp_2'] }])
  })

  it('turns the Rachio rain delay on to skip watering', () => {
    const rain = { ...states, [entities.irrigation.rainDelay]: entity(entities.irrigation.rainDelay, 'off') }
    const before = applyEntities(sampleHouse, rain).house
    const after = structuredClone(before)
    after.irrigation.rainSkip = true
    expect(serviceCalls(before, after, rain)).toEqual([{ domain: 'switch', service: 'turn_on', entityIds: [entities.irrigation.rainDelay] }])
  })

  it('sends nothing for things Home Assistant does not have yet', () => {
    expect(change((h) => { h.climate.setpointF += 1; h.safety.garage.open = true; h.mode = 'away' })).toEqual([])
  })
})

describe('actionCalls', () => {
  it('turns on a scene and turns every light off', () => {
    expect(actionCalls({ scene: { id: 'scene.lounge_lounge_vinyl', name: 'Vinyl', room: 'Lounge' } }))
      .toEqual([{ domain: 'scene', service: 'turn_on', entityIds: ['scene.lounge_lounge_vinyl'] }])
    expect(actionCalls({ allLightsOff: true })).toEqual([{ domain: 'light', service: 'turn_off', entityIds: ['all'] }])
  })

  it('sends colour presets only to colour bulbs, and white presets to every bulb', () => {
    const lights = {
      ...states,
      'light.lounge_lamp_1': entity('light.lounge_lamp_1', 'on', { supported_color_modes: ['xy', 'color_temp'] }),
      'light.lounge_lamp_2': entity('light.lounge_lamp_2', 'off', { supported_color_modes: ['color_temp'] }),
    }
    expect(actionCalls({ lights: { room: 'lounge', preset: 'ocean' } }, lights)).toEqual([
      { domain: 'light', service: 'turn_on', data: { hs_color: [205, 75], brightness_pct: 65 }, entityIds: ['light.lounge_lamp_1'] },
    ])
    expect(actionCalls({ lights: { room: 'lounge', preset: 'read' } }, lights)[0].entityIds).toEqual(['light.lounge_lamp_1', 'light.lounge_lamp_2'])
    expect(actionCalls({ lights: { room: 'kitchen', preset: 'read' } }, lights)).toEqual([])
  })

  it('runs the robovac, a Rachio zone and a water heater mode', () => {
    expect(actionCalls({ vacuum: 'dock' })).toEqual([{ domain: 'vacuum', service: 'return_to_base', entityIds: [entities.chores.vacuum] }])
    expect(actionCalls({ water: { valve: 'switch.meadowlake_rachio_2_back', minutes: 10 } }))
      .toEqual([{ domain: 'rachio', service: 'start_watering', data: { duration: 10 }, entityIds: ['switch.meadowlake_rachio_2_back'] }])
    expect(actionCalls({ water: { valve: 'switch.meadowlake_rachio_2_back', minutes: 0 } }))
      .toEqual([{ domain: 'switch', service: 'turn_off', entityIds: ['switch.meadowlake_rachio_2_back'] }])
    expect(actionCalls({ waterHeaterMode: 'high_demand' })).toEqual([
      { domain: 'water_heater', service: 'set_operation_mode', data: { operation_mode: 'high_demand' }, entityIds: [entities.appliances.waterHeater] },
    ])
  })

  it('moves, groups and ungroups Roon zones, and pauses Plex', () => {
    expect(actionCalls({ roon: { transfer: { from: 'media_player.a', to: 'media_player.b' } } }))
      .toEqual([{ domain: 'roon', service: 'transfer', data: { transfer_id: 'media_player.b' }, entityIds: ['media_player.a'] }])
    expect(actionCalls({ roon: { group: { leader: 'media_player.a', members: ['media_player.b'] } } }))
      .toEqual([{ domain: 'media_player', service: 'join', data: { group_members: ['media_player.b'] }, entityIds: ['media_player.a'] }])
    expect(actionCalls({ roon: { ungroup: 'media_player.a' } })).toEqual([{ domain: 'media_player', service: 'unjoin', entityIds: ['media_player.a'] }])
    expect(actionCalls({ plexToggle: 'media_player.plex_x' })).toEqual([{ domain: 'media_player', service: 'media_play_pause', entityIds: ['media_player.plex_x'] }])
  })

  it('asks the Blink cameras Home Assistant has for new pictures', () => {
    const states = { 'camera.front_door': { entity_id: 'camera.front_door', attributes: {} } } as unknown as Parameters<typeof actionCalls>[1]
    expect(actionCalls({ cameraSnap: true }, states)).toEqual([{ domain: 'blink', service: 'trigger_camera', entityIds: ['camera.front_door'] }])
    expect(actionCalls({ cameraSnap: true }, {})).toEqual([])
    const two = { ...states, 'camera.driveway': { entity_id: 'camera.driveway', attributes: {} } } as unknown as typeof states
    expect(actionCalls({ cameraRefresh: 'camera.driveway' }, two)).toEqual([{ domain: 'homeassistant', service: 'update_entity', entityIds: ['camera.driveway'] }])
    expect(actionCalls({ cameraSnap: true, camera: 'camera.driveway' }, two)).toEqual([{ domain: 'blink', service: 'trigger_camera', entityIds: ['camera.driveway'] }])
  })
})

describe('player controls', () => {
  const can = { pause: true, next: true, previous: true, volume: true, mute: true, power: true }
  const player = { id: 'media_player.theater_tv', name: 'Theater TV', state: 'off' as const, muted: true, can }

  it('maps each control to a media_player service', () => {
    const call = (command: PlayerCommand) => actionCalls({ player, command })[0]
    expect(call('play_pause')).toMatchObject({ service: 'media_play_pause' })
    expect(call('next')).toMatchObject({ service: 'media_next_track' })
    expect(call('previous')).toMatchObject({ service: 'media_previous_track' })
    expect(call('mute')).toEqual({ domain: 'media_player', service: 'volume_mute', data: { is_volume_muted: false }, entityIds: [player.id] })
    expect(call('power')).toMatchObject({ service: 'turn_on' })
    expect(call({ volume: 0.4 })).toMatchObject({ service: 'volume_set', data: { volume_level: 0.4 } })
  })
})
