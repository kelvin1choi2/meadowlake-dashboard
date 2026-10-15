import type { HassEntities } from 'home-assistant-js-websocket'
import type { HouseState } from '../data/types'
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
    calls.push({ domain: 'climate', service: 'set_temperature', data: { temperature: after.climate.setpointF }, entityIds: [thermostat] })
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
