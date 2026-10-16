import { Card, Chip, Dot, KV, Toggle } from '../widgets'
import type { Category } from './types'

export const chores: Category = {
  id: 'chores',
  name: 'Chores',
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
  Sheet: ({ house, update }) => {
    const v = house.chores.robovac
    return (
      <>
        <Card color="var(--chores)" title="Robovac" chip={<Chip tone="neutral">{v.state}</Chip>}>
          <KV rows={[['Battery', `${v.battery}%`], ['Last clean', v.lastClean], ...(v.next ? [['Next', v.next] as [string, string]] : [])]} />
          <Toggle label="Run when everyone leaves" on={v.runWhenAway} onChange={(on) => update((h) => { h.chores.robovac.runWhenAway = on })} />
        </Card>
        <Card color="var(--chores)" title="Upkeep">
          <KV rows={house.chores.upkeep.map((u): [string, string] => [u.label, u.due])} />
        </Card>
      </>
    )
  },
}
