import { describe, expect, it } from 'vitest'
import { nextSpotlight, spotlightPlan } from './spotlight'

describe('spotlightPlan', () => {
  it('holds tiles that need attention longer', () => {
    const plan = spotlightPlan([
      { id: 'inside', tone: 'good' },
      { id: 'data', tone: 'warn' },
      { id: 'safety', tone: 'bad' },
      { id: 'chores', tone: null },
    ])
    expect(plan.map((s) => s.seconds)).toEqual([12, 18, 24, 12])
  })
})

describe('nextSpotlight', () => {
  const plan = spotlightPlan([{ id: 'inside', tone: 'good' }, { id: 'outside', tone: 'good' }])

  it('advances and wraps around', () => {
    expect(nextSpotlight(plan, 'inside')?.id).toBe('outside')
    expect(nextSpotlight(plan, 'outside')?.id).toBe('inside')
  })

  it('starts over when the current tile is no longer in the plan', () => {
    expect(nextSpotlight(plan, 'media')?.id).toBe('inside')
    expect(nextSpotlight(plan, null)?.id).toBe('inside')
  })

  it('has nothing to show for an empty plan', () => {
    expect(nextSpotlight([], 'inside')).toBeNull()
  })
})
