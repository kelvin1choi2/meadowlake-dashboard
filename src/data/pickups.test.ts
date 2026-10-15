import { describe, expect, it } from 'vitest'
import { pickupRows } from './pickups'

describe('pickupRows', () => {
  it('lists the next pickups soonest first, marking today and tomorrow', () => {
    // Thursday, October 15 2026
    expect(pickupRows(new Date(2026, 9, 15))).toEqual([
      { label: 'Garbage', due: 'Tomorrow', soon: true },
      { label: 'Garbage, lawn waste, recycling', due: 'Tue' },
    ])
    // Tuesday
    expect(pickupRows(new Date(2026, 9, 20))[0]).toEqual({ label: 'Garbage, lawn waste, recycling', due: 'Today', soon: true })
  })
})
