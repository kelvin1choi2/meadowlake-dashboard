// Pure math behind the drawn widgets, kept apart from JSX so it can be unit tested.

export function ringDash(value: number, radius: number): { dash: number; circumference: number } {
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(1, value))
  return { dash: circumference * clamped, circumference }
}

/** Room temperature → CSS color: cool blue at 64°F, green near 66.5°F, amber near 71.5°F, red at 74°F. */
export function tempColor(tempF: number): string {
  const p = Math.max(0, Math.min(1, (tempF - 64) / 10))
  if (p < 0.5) {
    return `color-mix(in oklab, var(--safety) ${Math.round((1 - p * 2) * 100)}%, var(--outside))`
  }
  return `color-mix(in oklab, var(--appliances) ${Math.round((1 - (p - 0.5) * 2) * 100)}%, var(--inside))`
}

export interface SparkGeometry {
  width: number
  height: number
  left: number
  right: number
  x: (i: number) => number
  y: (v: number) => number
  gridLines: { value: number; y: number }[]
  linePoints: string
  areaPoints: string
}

/** Lays out a line chart with gridlines every 5 units, snapped outward to multiples of 5. */
export function sparkGeometry(values: number[], width = 560, height = 120): SparkGeometry {
  const pad = { l: 30, r: 10, t: 12, b: 22 }
  let min = Math.floor(Math.min(...values) / 5) * 5
  let max = Math.ceil(Math.max(...values) / 5) * 5
  if (min === max) max = min + 5
  const span = Math.max(1, values.length - 1)
  const x = (i: number) => pad.l + (i * (width - pad.l - pad.r)) / span
  const y = (v: number) => pad.t + ((max - v) * (height - pad.t - pad.b)) / (max - min)
  const gridLines: { value: number; y: number }[] = []
  for (let v = min; v <= max; v += 5) gridLines.push({ value: v, y: y(v) })
  const linePoints = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const base = height - pad.b
  const areaPoints = `${pad.l},${base} ${linePoints} ${x(values.length - 1).toFixed(1)},${base}`
  return { width, height, left: pad.l, right: width - pad.r, x, y, gridLines, linePoints, areaPoints }
}
