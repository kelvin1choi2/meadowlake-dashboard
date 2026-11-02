import type { KeyboardEvent, MouseEvent } from 'react'
import type { OutdoorLight } from '../data/types'
import type { UpdateHouse } from '../data/useHouse'
import { Card, Chip, Dimmer, Dot, Idea, KV, Sparkline, Toggle } from '../widgets'
import type { Category } from './types'

// The tile opens the sheet when tapped, so its own buttons keep their taps to themselves.
const own = { onClick: (e: MouseEvent) => e.stopPropagation(), onKeyDown: (e: KeyboardEvent) => e.stopPropagation() }

function setLight(update: UpdateHouse, notify: (m: string) => void, light: OutdoorLight, on: boolean) {
  update((h) => { const l = h.outdoorLights.find((x) => x.id === light.id); if (l) l.on = on })
  notify(`Turning ${light.name.toLowerCase()} ${on ? 'on' : 'off'}`)
}

function Bulb() {
  return (
    <svg className="bulb" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const MOCK = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('mock') : null

/** A big round button beside the temperature: the bulb glows while the light is on. */
function LightButton({ light, update, notify }: { light: OutdoorLight; update: UpdateHouse; notify: (m: string) => void }) {
  return (
    <button type="button" className={`light-btn${light.on ? ' on' : ''}`} disabled={!light.reachable} {...own}
      aria-pressed={light.on} aria-label={`${light.name}: turn ${light.on ? 'off' : 'on'}`}
      onClick={(e) => { e.stopPropagation(); setLight(update, notify, light, !light.on) }}>
      <span className="ring"><Bulb /></span>
      <span className="txt"><b>{light.name}</b><small>{!light.reachable ? 'Not answering' : light.on ? 'On · tap to turn off' : 'Off · tap to turn on'}</small></span>
    </button>
  )
}

export const outside: Category = {
  id: 'outside',
  name: 'Outside',
  apps: ['rachio', 'blink'],
  wide: true,
  status: (h) => (h.camerasArmed ? { tone: 'good', label: 'Cameras armed' } : { tone: 'warn', label: 'Cameras off' }),
  Tile: ({ house, update, notify }) => {
    const w = house.weather
    return (
      <>
        <div className="row">
          <div className="stat">
            <div className="lbl">Now</div>
            <div className="v num">{w.tempF}°<small> feels {w.feelsF}°</small></div>
          </div>
          {MOCK === 'b' && house.outdoorLights.map((l) => <LightButton key={l.id} light={l} update={update} notify={notify} />)}
          <div className="list grow">
            {MOCK !== 'b' && house.outdoorLights.map((l) => (
              <div key={l.id} className="lock-row">
                <Dot color={l.on ? 'var(--outside)' : 'var(--faint)'} /><span className="n">{l.name}</span>
                <span className="r">{!l.reachable ? 'Not answering' : l.on ? 'On' : 'Off'}</span>
                <span {...own}>
                  <button type="button" className={`btn sm${l.on ? '' : ' primary'}`} disabled={!l.reachable}
                    onClick={() => setLight(update, notify, l, !l.on)}>{l.on ? 'Turn off' : 'Turn on'}</button>
                </span>
              </div>
            ))}
            <div><Dot color="var(--safety)" />Blink · {house.cameras.length} cameras<span className="r">{house.camerasArmed ? 'Armed' : 'Off'}</span></div>
            <div><Dot color="var(--outside)" />Rachio · next run<span className="r num">{house.irrigation.zones[0].next}</span></div>
            <div><Dot color="var(--appliances)" />Sunset<span className="r num">{w.sunset}</span></div>
          </div>
        </div>
        <div className="fc">
          {w.daily.map((d) => (
            <div key={d.day} className="d">{d.day}<b className="num">{d.high}/{d.low}</b></div>
          ))}
        </div>
      </>
    )
  },
  Sheet: ({ house, update, run, notify }) => {
    const w = house.weather
    const ir = house.irrigation
    const shouldWater = !ir.rainSkip && ir.rain48hIn < 0.25
    return (
      <>
        <Card wide title="Next 12 hours" chip={<Chip tone="neutral">{w.rainNote}</Chip>}>
          <Sparkline points={w.hourly.map((p) => ({ label: p.label, value: p.tempF }))} color="var(--outside)" label="Hourly temperature forecast" />
        </Card>
        {house.outdoorLights.map((l, i) => (
          <Card key={l.id} color="var(--outside)" title={l.name} chip={<Chip tone={l.reachable ? 'neutral' : 'warn'}>{!l.reachable ? 'Not answering' : l.on ? 'On' : 'Off'}</Chip>}>
            <div className="light-big">
              <LightButton light={l} update={update} notify={notify} />
            </div>
            {l.dims && l.reachable && (
              <Dimmer label="Brightness" value={l.on ? l.brightness ?? 100 : 0}
                onCommit={(v) => update((h) => { h.outdoorLights[i].brightness = v; h.outdoorLights[i].on = true })} />
            )}
          </Card>
        ))}
        <Card color="var(--outside)" title="Rachio" chip={<Chip tone="neutral">Rain skip {ir.rainSkip ? 'on' : 'off'}</Chip>}>
          <KV rows={[...ir.zones.map((z): [string, string] => [z.name, `${z.next} · ${z.minutes}m`]), ['Rain, last 48h', `${ir.rain48hIn.toFixed(2)} in`]]} />
          <Toggle label="Skip watering for 24 hours" on={ir.rainSkip} onChange={(on) => update((h) => { h.irrigation.rainSkip = on })} />
          <Idea>Should I water? {shouldWater ? 'Yes. It has been dry.' : 'No. Recent rain or rain skip is on.'}</Idea>
        </Card>
        {ir.valves.length > 0 && (
          <Card color="var(--outside)" title="Water a zone now" chip={ir.valves.some((v) => v.running) ? <Chip tone="good">Watering</Chip> : undefined}>
            <div className="list valves">
              {ir.valves.map((v) => (
                <div key={v.id}>
                  <Dot color={v.running ? 'var(--good)' : 'var(--outside)'} />{v.name}
                  {v.running
                    ? <button className="btn sm" onClick={() => { run({ water: { valve: v.id, minutes: 0 } }); notify(`Stopping ${v.name}`) }}>Stop</button>
                    : <button className="btn sm" onClick={() => { run({ water: { valve: v.id, minutes: 10 } }); notify(`Watering ${v.name} for 10 minutes`) }}>Water 10 min</button>}
                </div>
              ))}
            </div>
          </Card>
        )}
        <Card title="Air & sky">
          <KV rows={([
            ['Air quality', w.aqi === undefined ? undefined : `${w.aqi} Good`],
            ['Pollen', w.pollen],
            ['UV', w.uv === undefined ? undefined : String(w.uv)],
            ['Wind', w.wind],
            ['Sunrise / sunset', `${w.sunrise} / ${w.sunset}`],
          ] as [string, string | undefined][]).filter((r): r is [string, string] => r[1] !== undefined)} />
        </Card>
      </>
    )
  },
}
