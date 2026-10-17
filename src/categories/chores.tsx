import { Card, Chip, Dot, KV, Toggle } from '../widgets'
import type { Category } from './types'

export const chores: Category = {
  id: 'chores',
  name: 'Chores',
  apps: ['smartlife'],
  wide: true,
  status: (h) => {
    const soon = h.chores.upkeep.filter((u) => u.soon).length
    return soon ? { tone: 'neutral', label: `${soon} due soon` } : null
  },
  Tile: ({ house }) => {
    const v = house.chores.robovac
    return (
      <div className="list">
        <div><Dot color="var(--chores)" />Robovac<span className="r">{v.state} · {v.battery}%</span></div>
        {house.chores.upkeep.filter((u) => u.soon).map((u) => (
          <div key={u.label}><Dot color="var(--warn)" />{u.label}<span className="r">{u.due}</span></div>
        ))}
      </div>
    )
  },
  Sheet: ({ house, update, run, notify }) => {
    const v = house.chores.robovac
    const cleaning = /clean|run/i.test(v.state)
    return (
      <>
        <Card color="var(--chores)" title="Robovac" chip={<Chip tone="neutral">{v.state}</Chip>}>
          <KV rows={[['Battery', `${v.battery}%`], ['Last clean', v.lastClean], ...(v.next ? [['Next', v.next] as [string, string]] : [])]} />
          <div className="btn-row">
            <button className="btn" disabled={cleaning} onClick={() => { run({ vacuum: 'start' }); notify('Robovac starting') }}>Start cleaning</button>
            <button className="btn" disabled={/dock|charg/i.test(v.state)} onClick={() => { run({ vacuum: 'dock' }); notify('Robovac heading home') }}>Send to dock</button>
          </div>
          <Toggle label="Run when everyone leaves" on={v.runWhenAway} onChange={(on) => update((h) => { h.chores.robovac.runWhenAway = on })} />
        </Card>
        <Card color="var(--chores)" title="Upkeep">
          <KV rows={house.chores.upkeep.map((u): [string, string] => [u.label, u.due])} />
        </Card>
      </>
    )
  },
}
