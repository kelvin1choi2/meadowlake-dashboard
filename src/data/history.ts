import type { HistoryKey } from './types'

/**
 * Readings bucketed into the last 24 hours, one point per hour, oldest first. An hour with no
 * new reading carries the last one forward, since sensors only report when the value changes.
 */
export function hourly(points: { at: Date; value: number }[], now: Date): { label: string; value: number }[] {
  const sorted = [...points].sort((a, b) => a.at.getTime() - b.at.getTime())
  if (!sorted.length) return []
  const out: { label: string; value: number }[] = []
  let i = 0
  let last: number | undefined
  for (let h = 23; h >= 0; h--) {
    const end = new Date(now.getTime() - h * 3600_000)
    const inHour: number[] = []
    while (i < sorted.length && sorted[i].at <= end) inHour.push(sorted[i++].value)
    const value = inHour.length ? inHour.reduce((a, b) => a + b, 0) / inHour.length : last
    if (value === undefined) continue
    last = inHour.length ? inHour[inHour.length - 1] : last
    const hr = end.getHours()
    out.push({ label: `${hr % 12 || 12}${hr < 12 ? 'a' : 'p'}`, value: Math.round(value * 10) / 10 })
  }
  return out
}

/** Made-up readings for the sample dashboard: a gentle daily curve, different per chart. */
export function sampleHistory(key: HistoryKey, now: Date): { at: Date; value: number }[] {
  const [base, swing, seed] = 'hotWater' in key ? [78, 18, 3] : 'volume' in key ? [70 + key.volume.length, 0.6, 5] : [68 + (key.room.length % 4), 3, key.room.length]
  return Array.from({ length: 48 }, (_, i) => {
    const at = new Date(now.getTime() - (47 - i) * 1800_000)
    const day = Math.sin(((at.getHours() + at.getMinutes() / 60 - 9) / 24) * 2 * Math.PI)
    const wobble = Math.sin(i * 1.7 + seed) * 0.25
    return { at, value: Math.round((base + swing * (day + wobble) + ('volume' in key ? i * 0.02 : 0)) * 10) / 10 }
  })
}
