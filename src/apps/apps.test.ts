import { describe, expect, it } from 'vitest'
import { appHref, deviceKind } from './apps'

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
    expect(appHref('hue', nas, undefined, 'touch')).toBe('shortcuts://run-shortcut?name=Open%20Hue')
    expect(appHref('ecobee', nas, ha, 'touch')).toBe('shortcuts://run-shortcut?name=Open%20Ecobee')
    expect(appHref('roon', nas, ha, 'touch')).toBe('shortcuts://run-shortcut?name=Open%20Roon')
    expect(appHref('ha', nas, undefined, 'touch')).toBe('shortcuts://run-shortcut?name=Open%20Home%20Assistant')
  })

  it('keeps web pages that have no app', () => {
    expect(appHref('dsm', nas, ha, 'touch')).toBe('http://nas.local:5000/')
    expect(appHref('rock', nas, ha, 'touch')).toMatch(/^http:/)
  })
})

describe('on a Mac', () => {
  it('runs Shortcuts only for apps that have a Mac version', () => {
    expect(appHref('roon', nas, ha, 'mac')).toBe('shortcuts://run-shortcut?name=Open%20Roon')
    expect(appHref('home', nas, ha, 'mac')).toBe('shortcuts://run-shortcut?name=Open%20Home')
    expect(appHref('plex', nas, ha, 'mac')).toBe('shortcuts://run-shortcut?name=Open%20Plex')
    expect(appHref('ecobee', nas, ha, 'mac')).toBe('https://www.ecobee.com/consumerportal/index.html')
    expect(appHref('hue', nas, ha, 'mac')).toBe('http://homeassistant.local:8123/config/integrations/integration/hue')
  })
})

describe('elsewhere', () => {
  it('hides apps that only exist as apps', () => {
    expect(appHref('roon', nas, ha)).toBeUndefined()
    expect(appHref('home', nas, ha)).toBeUndefined()
  })
})

describe('deviceKind', () => {
  it('spots iPads that say they are Macs', () => {
    expect(deviceKind('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5)).toBe('touch')
    expect(deviceKind('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 'iPhone', 5)).toBe('touch')
  })

  it('tells real Macs from PCs', () => {
    expect(deviceKind('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0)).toBe('mac')
    expect(deviceKind('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32', 10)).toBe('other')
  })
})

describe('on a Windows PC with the app helper', () => {
  const win = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'

  it('is only a Windows device once the helper is switched on', () => {
    expect(deviceKind(win, 'Win32', 0, true)).toBe('windows')
    expect(deviceKind(win, 'Win32', 0, false)).toBe('other')
    expect(deviceKind('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0, true)).toBe('mac')
  })

  it('opens the Windows apps through the helper and keeps websites for the rest', () => {
    expect(appHref('roon', nas, ha, 'windows')).toBe('meadowlake-app:roon')
    expect(appHref('smartthings', nas, ha, 'windows')).toBe('meadowlake-app:smartthings')
    expect(appHref('ecobee', nas, ha, 'windows')).toMatch(/^https:/)
    expect(appHref('home', nas, ha, 'windows')).toBeUndefined()
  })
})
