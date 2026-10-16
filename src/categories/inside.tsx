import type { CSSProperties } from 'react'
import { Card, Chip, KV, Toggle } from '../widgets'
import { tempColor } from '../widgets/geometry'
import type { Category } from './types'

export const inside: Category = {
  id: 'inside',
  name: 'Inside',
  apps: ['ecobee', 'hue'],
  wide: true,
  status: () => ({ tone: 'good', label: 'Comfortable' }),
  Tile: ({ house }) => {
    const lightsOn = house.rooms.reduce((n, r) => n + r.lightsOn, 0)
    const lightsTotal = house.rooms.reduce((n, r) => n + r.lightsTotal, 0)
    return (
      <>
        <div className="stats">
          <div className="stat">
            <div className="lbl">Thermostat</div>
            <div className="v num">{house.climate.currentF}°<small> {house.climate.mode.toLowerCase()} to {house.climate.setpointF}</small></div>
          </div>
          <div className="stat">
            <div className="lbl">Lights on</div>
            <div className="v num">{lightsOn}<small> of {lightsTotal}</small></div>
          </div>
          <div className="stat">
            <div className="lbl">Humidity</div>
            <div className="v num">{house.climate.humidity}<small>%</small></div>
          </div>
        </div>
        <div className="rooms">
          {house.rooms.map((r) => (
            <div key={r.id} className="room" style={{ '--tc': r.tempF === undefined ? 'var(--surface-2)' : tempColor(r.tempF) } as CSSProperties}>
              <div className="n">{r.name}</div>
              {r.tempF === undefined
                ? <div className="v num">{r.lightsOn}<small>/{r.lightsTotal} on</small></div>
                : <div className="v num">{r.tempF}°</div>}
            </div>
          ))}
        </div>
      </>
    )
  },
  Sheet: ({ house, update }) => (
    <>
      <Card title="Ecobee thermostat" chip={<Chip tone="good">{house.climate.action}</Chip>}>
        <div className="therm">
          <button className="step" aria-label="Lower set point" onClick={() => update((h) => { h.climate.setpointF -= 1 })}>−</button>
          <div>
            <div className="lbl">Set point</div>
            <div className="v num">{house.climate.setpointF}°</div>
          </div>
          <button className="step" aria-label="Raise set point" onClick={() => update((h) => { h.climate.setpointF += 1 })}>+</button>
        </div>
        <KV rows={[
          ['Mode', house.climate.mode],
          ['Comfort setting', house.climate.comfort],
          ...(house.climate.filterDays === undefined ? [] : [['Filter change', `${house.climate.filterDays} days`] as [string, string]]),
        ]} />
      </Card>
      {house.rooms.map((r, i) => (
        <Card key={r.id} title={r.name} color="var(--inside)" chip={<Chip tone={r.occupied ? 'good' : 'neutral'}>{r.occupied ? 'Occupied' : 'Empty'}</Chip>}>
          <div className="row">
            {r.tempF !== undefined && <div className="v num room-temp" style={{ color: tempColor(r.tempF) }}>{r.tempF}°</div>}
            {r.lightsTotal > 0 && <KV rows={[['Lights', r.lightsOn ? `${r.lightsOn} of ${r.lightsTotal} on` : 'Off']]} />}
          </div>
          {r.lightsTotal > 0 && (
            <Toggle
              label="Hue lights"
              on={r.lightsOn > 0}
              onChange={(on) => update((h) => { h.rooms[i].lightsOn = on ? h.rooms[i].lightsTotal : 0 })}
            />
          )}
          {r.fan !== undefined && (
            <Toggle label="Ceiling fan" on={r.fan} onChange={(on) => update((h) => { h.rooms[i].fan = on })} />
          )}
        </Card>
      ))}
    </>
  ),
}
