import { describe, expect, it } from 'vitest'
import { leave, leavingPlan, nothingToDo } from './leaving'
import { sampleHouse } from './sample'

describe('leaving', () => {
  it('lists what is on and what tapping Leave does', () => {
    const plan = leavingPlan(sampleHouse)
    expect(plan.lights).toEqual(['Living', 'Kitchen', 'Den'])
    expect(plan.screens).toEqual(['Apple TV den'])
    expect(plan.players.map((p) => p.name)).toEqual(['Linn Klimax DSM'])
    expect(plan.arm).toBe(false)
    expect(plan.vacuum).toBe(true)
  })

  it('switches everything off and arms the cameras, leaving the garage alone', () => {
    const h = structuredClone(sampleHouse)
    h.camerasArmed = false
    h.safety.garage.open = true
    leave(h)
    expect(h.rooms.every((r) => r.lightsOn === 0)).toBe(true)
    expect(h.media.screens.every((s) => !s.on)).toBe(true)
    expect(h.camerasArmed).toBe(true)
    expect(h.mode).toBe('away')
    expect(h.safety.garage.open).toBe(true)
    expect(nothingToDo(leavingPlan({ ...h, chores: { ...h.chores, robovac: { ...h.chores.robovac, runWhenAway: false } }, media: { ...h.media, players: [] } }))).toBe(true)
  })
})

describe('leaving with a door unlocked', () => {
  it('locks it', () => {
    const h = structuredClone(sampleHouse)
    h.safety.locks[0].state = 'unlocked'
    expect(leavingPlan(h).locks).toEqual(['Inside garage door'])
    leave(h)
    expect(h.safety.locks[0].state).toBe('locked')
    expect(leavingPlan(h).locks).toEqual([])
  })
})
