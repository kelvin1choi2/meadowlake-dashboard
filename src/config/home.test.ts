import { describe, expect, it } from 'vitest'
import { roonDisplayDirectUrl, roonDisplayUrl } from './home'

describe('roonDisplayUrl', () => {
  it('loads the display through the host serving the dashboard', () => {
    expect(roonDisplayUrl('http://192.168.4.20:8080/')).toBe('http://192.168.4.20:9330/display/')
    expect(roonDisplayUrl('http://choi-vault.local:8080/?view=wall')).toBe('http://choi-vault.local:9330/display/')
  })

  it('goes straight to the ROCK in local development', () => {
    expect(roonDisplayUrl('http://localhost:5173/')).toBe(roonDisplayDirectUrl)
    expect(roonDisplayUrl('http://127.0.0.1:5173/')).toBe(roonDisplayDirectUrl)
  })

  it('falls back to the ROCK for an unreadable address', () => {
    expect(roonDisplayUrl('not a url')).toBe(roonDisplayDirectUrl)
  })
})
