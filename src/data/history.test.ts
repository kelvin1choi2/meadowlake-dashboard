import { describe, expect, it } from 'vitest'
import { historyEntity, historyPoints } from '../ha/history'
import { hourly, sampleHistory } from './history'

const now = new Date(2026, 9, 17, 12, 0)

describe('history', () => {
  it('buckets readings by hour and carries the last one through quiet hours', () => {
    const at = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600_000)
    const out = hourly([{ at: at(30), value: 60 }, { at: at(5.5), value: 70 }, { at: at(5.2), value: 72 }], now)
    expect(out).toHaveLength(24)
    expect(out[0]).toEqual({ label: '1p', value: 60 })
    expect(out[18]).toEqual({ label: '7a', value: 71 })
    expect(out[23]).toEqual({ label: '12p', value: 72 })
    expect(hourly([], now)).toEqual([])
  })

  it('makes a full day of sample readings', () => {
    expect(hourly(sampleHistory({ room: 'living' }, now), now)).toHaveLength(24)
  })

  it('reads Home Assistant history rows and finds the entity for each chart', () => {
    expect(historyPoints([{ s: '71.5', lu: 1760000000 }, { s: 'unavailable', lu: 1760000100 }]))
      .toEqual([{ at: new Date(1760000000 * 1000), value: 71.5 }])
    expect(historyEntity({ room: 'lounge' })).toBe('sensor.lounge_sensor_temperature')
    expect(historyEntity({ room: 'kitchen' })).toBeUndefined()
    expect(historyEntity({ room: 'office' })).toBe('sensor.office_sensor_temperature')
    expect(historyEntity({ volume: 'Volume 2' })).toBe('sensor.choi_vault_volume_2_volume_used')
  })
})
