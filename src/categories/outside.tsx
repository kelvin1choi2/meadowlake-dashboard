import { Card, Chip, Dot, Idea, KV, Sparkline, Toggle } from '../widgets'
import type { Category } from './types'

export const outside: Category = {
  id: 'outside',
  name: 'Outside',
  apps: ['rachio', 'blink'],
  wide: true,
  status: (h) => (h.camerasArmed ? { tone: 'good', label: 'Cameras armed' } : { tone: 'warn', label: 'Cameras off' }),
  Tile: ({ house }) => {
    const w = house.weather
    return (
      <>
        <div className="row">
          <div className="stat">
            <div className="lbl">Now</div>
            <div className="v num">{w.tempF}°<small> feels {w.feelsF}°</small></div>
          </div>
          <div className="list grow">
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
        <Card wide color="var(--safety)" title="Blink cameras" chip={<Chip tone={house.camerasArmed ? 'good' : 'warn'}>{house.camerasArmed ? 'Armed' : 'Off'}</Chip>}>
          <div className="cams">
            {house.cameras.map((c) => (
              <div key={c.name} className="cam">
                {c.image && <img src={c.image} alt={`${c.name} camera`} />}
                <span>{c.name} · {c.lastMotion ? `Motion ${c.lastMotion}` : 'No motion today'}</span>
              </div>
            ))}
          </div>
          <Toggle label="Arm system" on={house.camerasArmed} onChange={(on) => update((h) => { h.camerasArmed = on })} />
          <button className="btn" onClick={() => { run({ cameraSnap: true }); notify('Asking the cameras for new pictures') }}>Take new pictures</button>
        </Card>
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
