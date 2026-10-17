import { describe, expect, it } from 'vitest'
import { sampleHouse } from '../data/sample'
import { houseAlerts, visibleAlerts } from './alerts'

const house = () => structuredClone(sampleHouse)

describe('houseAlerts', () => {
  it('flags the nearly full sample volume and nothing else', () => {
    expect(houseAlerts(house()).map((a) => a.title)).toEqual(['Volume 3 is 89% full'])
  })

  it('offers Snooze on a finished wash and Open Home on an open garage', () => {
    const h = house()
    h.appliances.washer = { ...h.appliances.washer, state: 'Done', doneAt: '9:05a' }
    h.safety.garage = { open: true, since: '8:00a' }
    const alerts = houseAlerts(h)
    expect(alerts.find((a) => a.id === 'washer@9:05a')?.buttons).toEqual([{ snooze: 30 }, { dismiss: true }])
    expect(alerts.find((a) => a.id === 'garage@8:00a')?.buttons).toEqual([{ app: 'home', label: 'Open Home' }, { snooze: 30 }])
  })

  it('puts leaks first', () => {
    const h = house()
    h.safety.leaks[0].wet = true
    h.safety.garage.open = true
    expect(houseAlerts(h)[0]).toMatchObject({ tone: 'bad', title: 'Leak: water heater sensor is wet' })
  })

  it('hides dismissed alerts, and snoozed ones until the snooze runs out', () => {
    const alerts = houseAlerts(house())
    expect(visibleAlerts(alerts, ['volume@Volume 3'], {}, 0)).toEqual([])
    expect(visibleAlerts(alerts, [], { 'volume@Volume 3': 1000 }, 999)).toEqual([])
    expect(visibleAlerts(alerts, [], { 'volume@Volume 3': 1000 }, 1000)).toEqual(alerts)
  })
})
