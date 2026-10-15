import { ERR_CANNOT_CONNECT, ERR_INVALID_AUTH } from 'home-assistant-js-websocket'
import { describe, expect, it } from 'vitest'
import { connectErrorText, normalizeHaUrl } from './connection'

describe('normalizeHaUrl', () => {
  it('adds http:// and drops paths and trailing slashes', () => {
    expect(normalizeHaUrl(' 10.0.0.5:8123 ')).toBe('http://10.0.0.5:8123')
    expect(normalizeHaUrl('http://ha.local:8123/lovelace/0')).toBe('http://ha.local:8123')
    expect(normalizeHaUrl('https://example.ui.nabu.casa/')).toBe('https://example.ui.nabu.casa')
  })

  it('rejects empty or unusable input', () => {
    expect(normalizeHaUrl('')).toBeNull()
    expect(normalizeHaUrl('http://')).toBeNull()
  })
})

describe('connectErrorText', () => {
  it('tells a bad token apart from an unreachable address', () => {
    expect(connectErrorText(ERR_INVALID_AUTH)).toMatch(/token/)
    expect(connectErrorText(ERR_CANNOT_CONNECT)).toMatch(/reach/)
  })
})
