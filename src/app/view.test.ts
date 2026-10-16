import { describe, expect, it } from 'vitest'
import { initialView, parseView } from './view'

describe('parseView', () => {
  it('accepts the three views and nothing else', () => {
    expect(parseView('standard')).toBe('standard')
    expect(parseView('wall')).toBe('wall')
    expect(parseView('saver')).toBe('saver')
    expect(parseView('tv')).toBeNull()
    expect(parseView(null)).toBeNull()
  })
})

describe('initialView', () => {
  it('prefers the address over the saved choice', () => {
    expect(initialView('?view=saver', 'wall')).toBe('saver')
  })

  it('uses the saved choice when the address has none', () => {
    expect(initialView('', 'wall')).toBe('wall')
    expect(initialView('?view=nonsense', 'wall')).toBe('wall')
  })

  it('defaults to standard', () => {
    expect(initialView('', null)).toBe('standard')
    expect(initialView('', 'garbage')).toBe('standard')
  })
})
