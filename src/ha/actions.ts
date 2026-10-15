import type { HassEntities } from 'home-assistant-js-websocket'
import type { HouseAction, HouseState } from '../data/types'
import { entities } from './entities'
import { roomLights } from './map'

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
    if (!was || !cfg || (was.lightsOn > 0) === (room.lightsOn > 0)) continue
    const ids = roomLights(states, cfg.lights).map((e) => e.entity_id)
    if (ids.length) calls.push({ domain: 'light', service: room.lightsOn > 0 ? 'turn_on' : 'turn_off', entityIds: ids })
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

  const blink = entities.cameras.armed
  if (before.camerasArmed !== after.camerasArmed && has(blink)) {
    calls.push({ domain: 'alarm_control_panel', service: after.camerasArmed ? 'alarm_arm_away' : 'alarm_disarm', entityIds: [blink] })
  }

  return calls
}

/** The service call for a one-tap action: a scene, all lights off, or a media player control. */
export function actionCall(action: HouseAction): ServiceCall {
  if ('scene' in action) return { domain: 'scene', service: 'turn_on', entityIds: [action.scene.id] }
  if ('player' in action) {
    const { player, command } = action
    const ids = [player.id]
    if (typeof command === 'object') return { domain: 'media_player', service: 'volume_set', data: { volume_level: command.volume }, entityIds: ids }
    switch (command) {
      case 'play_pause': return { domain: 'media_player', service: 'media_play_pause', entityIds: ids }
      case 'next': return { domain: 'media_player', service: 'media_next_track', entityIds: ids }
      case 'previous': return { domain: 'media_player', service: 'media_previous_track', entityIds: ids }
      case 'mute': return { domain: 'media_player', service: 'volume_mute', data: { is_volume_muted: !player.muted }, entityIds: ids }
      case 'power': return { domain: 'media_player', service: player.state === 'off' ? 'turn_on' : 'turn_off', entityIds: ids }
    }
  }
  return { domain: 'light', service: 'turn_off', entityIds: ['all'] }
}
