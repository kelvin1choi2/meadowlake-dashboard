import { describe, expect, it } from 'vitest'
import { appHref } from './apps'

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
