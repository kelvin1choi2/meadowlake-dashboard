import { Bar, Card, Chip, Dot, Holdable, Idea, KV, Segmented, Toggle } from '../widgets'
import type { Category, HistoryChart } from './types'

const hotWater: HistoryChart = { category: 'appliances', key: { hotWater: true }, title: 'Hot water available', unit: '%' }

export const appliances: Category = {
  id: 'appliances',
  name: 'Appliances',
  apps: ['smartthings', 'thinq', 'econet'],
  status: (h) => (h.appliances.washer.minutesLeft > 0 ? { tone: 'neutral', label: 'Washer running' } : null),
  Tile: ({ house, showHistory }) => {
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
          <Holdable onHold={() => showHistory(hotWater)}>
            <Dot color="var(--appliances)" />Water heater<span className="r num">{a.waterHeater.setpointF}° · {a.waterHeater.mode === 'Energy Saver' ? 'Eco' : a.waterHeater.mode}</span>
          </Holdable>
        </div>
      </>
    )
  },
  Sheet: ({ house, update, run, notify, showHistory }) => {
    const a = house.appliances
    return (
      <>
        <Card color="var(--appliances)" title="Samsung washer" chip={<Chip tone="neutral">{a.washer.state}</Chip>}>
          <Bar value={a.washer.progress} />
          <KV rows={[['Cycle', a.washer.cycle], ['Done at', a.washer.doneAt]]} />
          <Idea>When a wash finishes, a banner across the top says so, with Snooze 30 min.</Idea>
        </Card>
        <Card color="var(--appliances)" title="LG ThinQ range" chip={<Chip tone="neutral">{a.range.oven}</Chip>}>
          <KV rows={[['Oven', a.range.oven], ['Cooktop', a.range.cooktop], ['Last used', a.range.lastUsed]]} />
          <Idea>Preheat timer shows here, and an alert fires if the oven is on in Away mode.</Idea>
        </Card>
        <Card color="var(--appliances)" title="Rheem water heater" chip={<Chip tone="good">Ready</Chip>}>
          <KV rows={[
            ['Set point', `${a.waterHeater.setpointF}°F`],
            ['Mode', a.waterHeater.mode],
            ['Hot water available', <button key="hw" className="linkish" onClick={() => showHistory(hotWater)}>~{a.waterHeater.availablePct}% <span className="chart-hint">24h</span></button>],
          ]} />
          {a.waterHeater.modes && (
            <Segmented label="Water heater mode" options={a.waterHeater.modes} value={a.waterHeater.modeId}
              onChange={(id) => { run({ waterHeaterMode: id }); notify(`Water heater: ${a.waterHeater.modes?.find((m) => m.id === id)?.label ?? id}`) }} />
          )}
          <Toggle label="Vacation mode" on={a.waterHeater.vacation} onChange={(on) => update((h) => { h.appliances.waterHeater.vacation = on })} />
        </Card>
      </>
    )
  },
}
