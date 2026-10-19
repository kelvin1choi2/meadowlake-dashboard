import type { HassEntities } from 'home-assistant-js-websocket'
import type { HouseAction, HouseState, LightPreset } from '../data/types'
import { lightPresets } from '../data/lightPresets'
import { entities } from './entities'
import { lightLook, roomLights } from './map'

// Turns a change the UI made to HouseState into Home Assistant service calls, by
// comparing the house before and after. Pure, so it's unit tested. Only entities
// Home Assistant actually has get a call; everything else stays a local change.
// The garage door is left out on purpose: opening it should never be one stray tap.

export interface ServiceCall {
  domain: string
  service: string
  data?: Record<string, unknown>
  entityIds: string[]
}

export function serviceCalls(before: HouseState, after: HouseState, states: HassEntities): ServiceCall[] {
  const calls: ServiceCall[] = []
  const has = (id: string) => id in states && states[id].state !== 'unavailable'

  for (const room of after.rooms) {
    const was = before.rooms.find((r) => r.id === room.id)
    const cfg = entities.rooms.find((r) => r.id === room.id)
    if (!was || !cfg) continue
    const switched = (was.lightsOn > 0) !== (room.lightsOn > 0)
    const dimmed = room.lightsOn > 0 && room.brightness !== undefined && room.brightness !== was.brightness
    if (!switched && !dimmed) continue
    const ids = roomLights(states, cfg.lights).map((e) => e.entity_id)
    if (!ids.length) continue
    if (room.lightsOn === 0) calls.push({ domain: 'light', service: 'turn_off', entityIds: ids })
    else calls.push({ domain: 'light', service: 'turn_on', ...(dimmed ? { data: { brightness_pct: room.brightness } } : {}), entityIds: ids })
  }

  for (const screen of after.media.screens) {
    const was = before.media.screens.find((s) => s.id === screen.id)
    const cfg = entities.media.screens.find((s) => s.id === screen.id)
    if (!was || !cfg || was.on === screen.on || !has(cfg.entity)) continue
    calls.push({ domain: 'media_player', service: screen.on ? 'turn_on' : 'turn_off', entityIds: [cfg.entity] })
  }

  const thermostat = entities.climate.thermostat
  if (before.climate.setpointF !== after.climate.setpointF && has(thermostat)) {
    const a = states[thermostat].attributes
    const delta = after.climate.setpointF - before.climate.setpointF
    // In auto mode Ecobee has a low and a high target; move both so the gap between them holds.
    const data = typeof a.temperature === 'number' || typeof a.target_temp_low !== 'number' || typeof a.target_temp_high !== 'number'
      ? { temperature: after.climate.setpointF }
      : { target_temp_low: a.target_temp_low + delta, target_temp_high: a.target_temp_high + delta }
    calls.push({ domain: 'climate', service: 'set_temperature', data, entityIds: [thermostat] })
  }

  const heater = entities.appliances.waterHeater
  if (before.appliances.waterHeater.vacation !== after.appliances.waterHeater.vacation && has(heater)) {
    calls.push({ domain: 'water_heater', service: 'set_away_mode', data: { away_mode: after.appliances.waterHeater.vacation }, entityIds: [heater] })
  }

  const rain = entities.irrigation.rainDelay
  if (before.irrigation.rainSkip !== after.irrigation.rainSkip && has(rain)) {
    calls.push({ domain: 'switch', service: after.irrigation.rainSkip ? 'turn_on' : 'turn_off', entityIds: [rain] })
  }

  const blink = entities.cameras.armed
  if (before.camerasArmed !== after.camerasArmed && has(blink)) {
    calls.push({ domain: 'alarm_control_panel', service: after.camerasArmed ? 'alarm_arm_away' : 'alarm_disarm', entityIds: [blink] })
  }

  return calls
}

/** What each light preset sets. Colour presets only go to lights that can show colour. */
export const presetData: Record<LightPreset, Record<string, unknown>> = {
  relax: { color_temp_kelvin: 2700, brightness_pct: 45 },
  read: { color_temp_kelvin: 4000, brightness_pct: 100 },
  daylight: { color_temp_kelvin: 5500, brightness_pct: 100 },
  sunset: { hs_color: [22, 85], brightness_pct: 70 },
  ocean: { hs_color: [205, 75], brightness_pct: 65 },
  forest: { hs_color: [125, 60], brightness_pct: 60 },
}

/**
 * The service calls for a one-tap action: a scene, all lights off, a player control, a light
 * preset, the robovac, a Rachio zone, a water heater mode, Roon zones or a Plex stream.
 * Empty when Home Assistant has nothing to send it to.
 */
export function actionCalls(action: Exclude<HouseAction, { rock: unknown }>, states: HassEntities = {}): ServiceCall[] {
  if ('scene' in action) return [{ domain: 'scene', service: 'turn_on', entityIds: [action.scene.id] }]
  if ('allLightsOff' in action) return [{ domain: 'light', service: 'turn_off', entityIds: ['all'] }]
  if ('player' in action) {
    const { player, command } = action
    const ids = [player.id]
    if (typeof command === 'object') return [{ domain: 'media_player', service: 'volume_set', data: { volume_level: command.volume }, entityIds: ids }]
    switch (command) {
      case 'play_pause': return [{ domain: 'media_player', service: 'media_play_pause', entityIds: ids }]
      case 'next': return [{ domain: 'media_player', service: 'media_next_track', entityIds: ids }]
      case 'previous': return [{ domain: 'media_player', service: 'media_previous_track', entityIds: ids }]
      case 'mute': return [{ domain: 'media_player', service: 'volume_mute', data: { is_volume_muted: !player.muted }, entityIds: ids }]
      case 'power': return [{ domain: 'media_player', service: player.state === 'off' ? 'turn_on' : 'turn_off', entityIds: ids }]
    }
  }
  if ('lights' in action) {
    const cfg = entities.rooms.find((r) => r.id === action.lights.room)
    const color = lightPresets.find((p) => p.id === action.lights.preset)?.color
    const lights = cfg ? roomLights(states, cfg.lights).filter((e) => !color || lightLook([e]).color) : []
    return lights.length ? [{ domain: 'light', service: 'turn_on', data: presetData[action.lights.preset], entityIds: lights.map((e) => e.entity_id) }] : []
  }
  if ('vacuum' in action) {
    return [{ domain: 'vacuum', service: action.vacuum === 'start' ? 'start' : 'return_to_base', entityIds: [entities.chores.vacuum] }]
  }
  if ('water' in action) {
    const { valve, minutes } = action.water
    return minutes > 0
      ? [{ domain: 'rachio', service: 'start_watering', data: { duration: minutes }, entityIds: [valve] }]
      : [{ domain: 'switch', service: 'turn_off', entityIds: [valve] }]
  }
  if ('waterHeaterMode' in action) {
    return [{ domain: 'water_heater', service: 'set_operation_mode', data: { operation_mode: action.waterHeaterMode }, entityIds: [entities.appliances.waterHeater] }]
  }
  if ('roon' in action) {
    const r = action.roon
    if ('transfer' in r) return [{ domain: 'roon', service: 'transfer', data: { transfer_id: r.transfer.to }, entityIds: [r.transfer.from] }]
    if ('group' in r) return [{ domain: 'media_player', service: 'join', data: { group_members: r.group.members }, entityIds: [r.group.leader] }]
    return [{ domain: 'media_player', service: 'unjoin', entityIds: [r.ungroup] }]
  }
  if ('cameraSnap' in action) {
    const cams = entities.cameras.list.map((c) => c.camera).filter((id) => states[id])
    return cams.length ? [{ domain: 'blink', service: 'trigger_camera', entityIds: cams }] : []
  }
  return [{ domain: 'media_player', service: 'media_play_pause', entityIds: [action.plexToggle] }]
}
