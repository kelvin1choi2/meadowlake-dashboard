import { Card, Chip, Dot, Idea, KV, Toggle } from '../widgets'
import type { Category } from './types'

export const safety: Category = {
  id: 'safety',
  name: 'Safety',
  status: (h) => {
    if (h.safety.leaks.some((l) => l.wet)) return { tone: 'bad', label: 'Leak!' }
    if (h.safety.garage.open) return { tone: 'warn', label: 'Garage open' }
    return { tone: 'good', label: 'All clear' }
  },
  Tile: ({ house }) => (
    <div className="list">
      <div><Dot color={house.safety.garage.open ? 'var(--warn)' : 'var(--good)'} />Garage door<span className="r">{house.safety.garage.open ? 'Open' : 'Closed'}</span></div>
      {house.safety.leaks.map((l) => (
        <div key={l.name}><Dot color={l.wet ? 'var(--bad)' : 'var(--good)'} />Leak · {l.name.toLowerCase()}<span className="r">{l.wet ? 'Wet' : 'Dry'}</span></div>
      ))}
      <div><Dot color={house.camerasArmed ? 'var(--good)' : 'var(--warn)'} />Cameras<span className="r">{house.camerasArmed ? 'Armed' : 'Off'}</span></div>
    </div>
  ),
  Sheet: ({ house, update }) => {
    const g = house.safety.garage
    const stillOn = [
      ...house.rooms.filter((r) => r.lightsOn > 0).map((r) => `${r.name} lights`),
      ...house.media.screens.filter((s) => s.on).map((s) => s.name),
    ]
    return (
      <>
        <Card color="var(--safety)" title="Garage door" chip={<Chip tone={g.open ? 'warn' : 'good'}>{g.open ? 'Open' : 'Closed'}</Chip>}>
          <KV rows={[['Last opened', g.lastOpened], ['Open for', g.openFor]]} />
          <Toggle label="Open" on={g.open} onChange={(on) => update((h) => { h.safety.garage.open = on })} />
          <Idea>Auto-close if left open 10 minutes after sunset.</Idea>
        </Card>
        <Card color="var(--safety)" title="Leak detectors" chip={<Chip tone={house.safety.leaks.some((l) => l.wet) ? 'bad' : 'good'}>{house.safety.leaks.some((l) => l.wet) ? 'Wet' : 'Dry'}</Chip>}>
          <KV rows={house.safety.leaks.map((l): [string, string] => [l.name, `${l.wet ? 'Wet' : 'Dry'} · battery ${l.battery}%`])} />
          <Idea>A leak turns the whole panel red and announces on every Alexa.</Idea>
        </Card>
        <Card color="var(--safety)" title="Leaving-home check">
          <div className="list">
            {stillOn.map((s) => <div key={s}><Dot color="var(--warn)" />{s}<span className="r">On</span></div>)}
            <div><Dot color="var(--good)" />Oven, garage<span className="r">{house.appliances.range.oven}, {g.open ? 'open' : 'closed'}</span></div>
          </div>
        </Card>
      </>
    )
  },
}
