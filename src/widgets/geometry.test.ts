import { describe, expect, it } from 'vitest'
import { ringDash, sparkGeometry, tempColor } from './geometry'

describe('ringDash', () => {
  it('fills the matching share of the circle', () => {
    const { dash, circumference } = ringDash(0.25, 10)
    expect(dash).toBeCloseTo(circumference / 4)
  })

  it('clamps values outside 0–1', () => {
    expect(ringDash(-1, 10).dash).toBe(0)
    expect(ringDash(2, 10).dash).toBeCloseTo(ringDash(1, 10).circumference)
  })
})

describe('tempColor', () => {
  it('is fully blue at or below 64°F and fully red at or above 74°F', () => {
    expect(tempColor(60)).toContain('var(--safety) 100%')
    expect(tempColor(80)).toContain('var(--appliances) 0%')
  })
})

describe('sparkGeometry', () => {
  it('snaps the axis to multiples of 5 and places one gridline per step', () => {
    const g = sparkGeometry([54, 68, 61])
    expect(g.gridLines.map((l) => l.value)).toEqual([50, 55, 60, 65, 70])
  })

  it('handles a flat series without dividing by zero', () => {
    const g = sparkGeometry([60, 60])
    expect(Number.isFinite(g.y(60))).toBe(true)
  })
})
