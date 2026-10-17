import { describe, expect, it } from 'vitest'
import { appHref, isAppleTouch } from './apps'

const nas = 'http://nas.local:8080/'
const ha = 'http://homeassistant.local:8123'

describe('appHref', () => {
  it('uses the vendor web page when there is one', () => {
    expect(appHref('ecobee', nas)).toBe('https://www.ecobee.com/consumerportal/index.html')
    expect(appHref('plex', nas, ha)).toBe('https://app.plex.tv/desktop')
  })

  it('opens the Home Assistant integration for app-only devices', () => {
    expect(appHref('hue', nas, ha)).toBe('http://homeassistant.local:8123/config/integrations/integration/hue')
    expect(appHref('smartlife', nas, ha)).toBe('http://homeassistant.local:8123/config/integrations/integration/tuya')
  })

  it('has no link for app-only devices without Home Assistant', () => {
    expect(appHref('hue', nas)).toBeUndefined()
    expect(appHref('ha', nas)).toBeUndefined()
  })

  it('opens DSM on the NAS that serves the dashboard', () => {
    expect(appHref('dsm', nas, ha)).toBe('http://nas.local:5000/')
  })

  it('falls back to Home Assistant for DSM when not served from the NAS', () => {
    expect(appHref('dsm', 'http://localhost:5173/', ha)).toBe('http://homeassistant.local:8123/config/integrations/integration/synology_dsm')
    expect(appHref('dsm', 'https://kelvin1choi2.github.io/meadowlake-dashboard/')).toBeUndefined()
  })

  it('opens scenes in Home Assistant', () => {
    expect(appHref('ha', nas, ha)).toBe('http://homeassistant.local:8123/config/scene/dashboard')
  })
})

describe('on an iPad', () => {
  it('runs the Open <app> Shortcut, with or without Home Assistant', () => {
    expect(appHref('hue', nas, undefined, true)).toBe('shortcuts://run-shortcut?name=Open%20Hue')
    expect(appHref('ecobee', nas, ha, true)).toBe('shortcuts://run-shortcut?name=Open%20Ecobee')
    expect(appHref('ha', nas, undefined, true)).toBe('shortcuts://run-shortcut?name=Open%20Home%20Assistant')
  })

  it('keeps web pages that have no app', () => {
    expect(appHref('dsm', nas, ha, true)).toBe('http://nas.local:5000/')
    expect(appHref('roon', nas, ha, true)).toMatch(/^http:/)
  })
})

describe('isAppleTouch', () => {
  it('spots iPads that say they are Macs', () => {
    expect(isAppleTouch('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5)).toBe(true)
    expect(isAppleTouch('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 'iPhone', 5)).toBe(true)
  })

  it('leaves real Macs and PCs alone', () => {
    expect(isAppleTouch('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0)).toBe(false)
    expect(isAppleTouch('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32', 10)).toBe(false)
  })
})
