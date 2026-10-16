import { describe, expect, it } from 'vitest'
import { initialTheme, parseTheme, resolveTheme } from './theme'

describe('parseTheme', () => {
  it('accepts light, dark and auto and nothing else', () => {
    expect(parseTheme('light')).toBe('light')
    expect(parseTheme('dark')).toBe('dark')
    expect(parseTheme('auto')).toBe('auto')
    expect(parseTheme('neon')).toBeNull()
    expect(parseTheme(null)).toBeNull()
  })
})

describe('initialTheme', () => {
  it('prefers the address over the saved choice', () => {
    expect(initialTheme('?theme=dark', 'light')).toBe('dark')
  })

  it('uses the saved choice, then defaults to auto', () => {
    expect(initialTheme('', 'light')).toBe('light')
    expect(initialTheme('?theme=nonsense', 'dark')).toBe('dark')
    expect(initialTheme('', null)).toBe('auto')
  })
})

describe('resolveTheme', () => {
  it('follows the system only on auto', () => {
    expect(resolveTheme('auto', true)).toBe('dark')
    expect(resolveTheme('auto', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})
