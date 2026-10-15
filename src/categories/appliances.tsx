import { Bar, Card, Chip, Dot, Idea, KV, Toggle } from '../widgets'
import type { Category } from './types'

export const appliances: Category = {
  id: 'appliances',
  name: 'Appliances',
  status: (h) => (h.appliances.washer.minutesLeft > 0 ? { tone: 'neutral', label: 'Washer running' } : null),
  Tile: ({ house }) => {
    const a = house.appliances
    return (
      <>
        <div>
          <div className="lbl">Washer</div>
          <div className="stat">
            {a.washer.minutesLeft > 0
              ? <div className="v num">{a.washer.minutesLeft}<small> min left</small></div>
              : <div className="v">{a.washer.state}</div>}
          </div>
          <Bar value={a.washer.progress} color="var(--appliances)" />
        </div>
        <div className="list">
          <div><Dot />Stove<span className="r">{a.range.oven}</span></div>
          <div><Dot color="var(--appliances)" />Water heater<span className="r num">{a.waterHeater.setpointF}° · {a.waterHeater.mode === 'Energy Saver' ? 'Eco' : a.waterHeater.mode}</span></div>
        </div>
      </>
    )
  },
  Sheet: ({ house, update }) => {
    const a = house.appliances
    return (
      <>
        <Card color="var(--appliances)" title="Samsung washer" chip={<Chip tone="neutral">{a.washer.state}</Chip>}>
          <Bar value={a.washer.progress} />
          <KV rows={[['Cycle', a.washer.cycle], ['Done at', a.washer.doneAt]]} />
          <Idea>Announce on Alexa when done, then remind again after 30 minutes.</Idea>
        </Card>
        <Card color="var(--appliances)" title="LG ThinQ range" chip={<Chip tone="neutral">{a.range.oven}</Chip>}>
          <KV rows={[['Oven', a.range.oven], ['Cooktop', a.range.cooktop], ['Last used', a.range.lastUsed]]} />
          <Idea>Preheat timer shows here, and an alert fires if the oven is on in Away mode.</Idea>
        </Card>
        <Card color="var(--appliances)" title="Rheem water heater" chip={<Chip tone="good">Ready</Chip>}>
          <KV rows={[['Set point', `${a.waterHeater.setpointF}°F`], ['Mode', a.waterHeater.mode], ['Hot water available', `~${a.waterHeater.availablePct}%`]]} />
          <Toggle label="Vacation mode" on={a.waterHeater.vacation} onChange={(on) => update((h) => { h.appliances.waterHeater.vacation = on })} />
        </Card>
      </>
    )
  },
}
