import { useEffect, useState } from 'react'
import type { HistoryChart } from '../categories/types'
import { hourly } from '../data/history'
import type { FetchHistory } from '../data/types'
import { Card, Sparkline } from '../widgets'
import { Sheet } from './Sheet'

/** The last 24 hours of one reading, hour by hour. */
export function History({ chart, history, onClose }: { chart: HistoryChart; history: FetchHistory; onClose: () => void }) {
  const [points, setPoints] = useState<{ label: string; value: number }[] | null | 'loading'>('loading')
  useEffect(() => {
    let live = true
    history(chart.key).then(
      (p) => { if (live) setPoints(p ? hourly(p, new Date()) : null) },
      () => { if (live) setPoints(null) },
    )
    return () => { live = false }
  }, [chart, history])

  const values = Array.isArray(points) ? points.map((p) => p.value) : []
  const fmt = (n: number) => `${Math.round(n * 10) / 10}${chart.unit}`
  return (
    <Sheet id={chart.category} title={chart.title} onClose={onClose} small>
      <Card wide title="Last 24 hours" chip={values.length > 1 ? <span className="chip neutral">Low {fmt(Math.min(...values))} · High {fmt(Math.max(...values))}</span> : undefined}>
        {points === 'loading' && <p className="muted">Loading…</p>}
        {points === null || (Array.isArray(points) && points.length < 2)
          ? <p className="muted">No history for this yet. Home Assistant keeps 10 days of readings once a sensor has been linked for a while.</p>
          : Array.isArray(points) && <Sparkline points={points} color="var(--c)" label={`${chart.title}, last 24 hours`} unit={chart.unit} />}
      </Card>
    </Sheet>
  )
}
