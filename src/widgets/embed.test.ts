import { describe, expect, it } from 'vitest'
import { canEmbed } from './embed'

const roon = 'http://192.168.4.41:9330/display/'

describe('canEmbed', () => {
  it('allows an http page on the home network', () => {
    expect(canEmbed(roon, 'http://mac-mini.local:4173/')).toBe(true)
    expect(canEmbed(roon, 'http://localhost:5173/')).toBe(true)
  })

  it('refuses from the https demo site, which the browser would block', () => {
    expect(canEmbed(roon, 'https://kelvin1choi2.github.io/meadowlake-dashboard/')).toBe(false)
  })

  it('refuses a malformed address', () => {
    expect(canEmbed('not a url', 'http://localhost/')).toBe(false)
  })
})
