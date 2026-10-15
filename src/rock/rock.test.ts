import { describe, expect, it } from 'vitest'
import { duration, parseRock, seconds } from './rock'

// Shape of a real /1/getstate answer, with made-up identifiers.
const getstate = {
  status: 'Success',
  data: {
    device_vendor: 'Roon Labs',
    device_model: 'Roon Optimized Core Kit',
    device_serial: '000000000000',
    device_display_version: '1.0 (build 259) production',
    state: {
      mounted_data: true,
      has_data: true,
      roon_running: true,
      uptime: '60605',
      roon_version: '2.73 (build 1700) production',
      roon_uptime: '60596',
      has_ffmpeg: true,
      has_vendor: false,
      data_used: 10370080,
      data_total: 243725932,
      internal_storage: null,
      cd: { status: 'no_cd_rom' },
    },
    interfaces: [
      {
        interface: 'eth0',
        name: 'Ethernet',
        config: { enabled: true, use_dhcp: false, static_ip: '192.168.1.40' },
        state: { ip: '192.168.1.40', netmask: '255.255.255.0', gateway: '192.168.1.1', dns: '1.1.1.1' },
      },
    ],
  },
}

const withState = (patch: object) => ({ ...getstate, data: { ...getstate.data, state: { ...getstate.data.state, ...patch } } })

describe('parseRock', () => {
  it('reads what the ROCK page shows', () => {
    expect(parseRock(getstate)).toEqual({
      status: 'up',
      model: 'Roon Optimized Core Kit',
      os: '1.0 (build 259)',
      roon: 'running',
      roonVersion: '2.73 (build 1700)',
      roonUptime: 60596,
      uptime: 60605,
      disk: { used: 9.9, total: 232.4 },
      music: undefined,
      ip: '192.168.1.40',
      dhcp: false,
      gateway: '192.168.1.1',
      dns: '1.1.1.1',
      cd: undefined,
    })
  })

  it('tells stopped from missing codecs', () => {
    expect(parseRock(withState({ roon_running: false }))).toMatchObject({ roon: 'stopped' })
    expect(parseRock(withState({ has_ffmpeg: false }))).toMatchObject({ roon: 'missing-codecs' })
    expect(parseRock(withState({ roon_running: false }))).toMatchObject({ roonUptime: undefined })
  })

  it('reads an internal music drive and the CD drive', () => {
    const r = parseRock(withState({
      internal_storage: { mounted: true, data_used: 1048576 * 500, data_total: 1048576 * 2000 },
      cd: { status: 'ripping', track: 3, track_count: 11 },
    }))
    expect(r).toMatchObject({ music: { used: 500, total: 2000 }, cd: { label: 'Ripping track 3 of 11', canEject: false } })
    expect(parseRock(withState({ internal_storage: { mounted: false } }))).toMatchObject({ music: 'not mounted' })
    expect(parseRock(withState({ cd: { status: 'waiting' } }))).toMatchObject({ cd: { label: 'No disc', canEject: true } })
  })

  it('rejects an error answer', () => {
    expect(() => parseRock({ status: 'InvalidRequest' })).toThrow('InvalidRequest')
    expect(() => parseRock(null)).toThrow()
  })
})

describe('seconds and duration', () => {
  it('reads plain seconds and D:H:M:S', () => {
    expect(seconds('60605')).toBe(60605)
    expect(seconds('1:02:03:04')).toBe(86400 + 7200 + 180 + 4)
    expect(seconds('')).toBeUndefined()
    expect(seconds('soon')).toBeUndefined()
  })

  it('writes short durations', () => {
    expect(duration(60605)).toBe('16h 50m')
    expect(duration(3 * 86400 + 5 * 3600)).toBe('3d 5h')
    expect(duration(125)).toBe('2m')
    expect(duration(undefined)).toBe('—')
  })
})
