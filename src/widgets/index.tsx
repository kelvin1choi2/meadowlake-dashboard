import type { CSSProperties, ReactNode } from 'react'
import type { CategoryId, Tone } from '../data/types'
import { ringDash, sparkGeometry } from './geometry'

const iconPaths: Record<CategoryId, ReactNode> = {
  inside: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  outside: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  media: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  data: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </>
  ),
  appliances: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <circle cx="12" cy="14" r="4" />
      <path d="M9 6h.01M12 6h.01" />
    </>
  ),
  safety: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  chores: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3" />
    </>
  ),
  scenes: <path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" />,
}

export function Icon({ id }: { id: CategoryId }) {
  return (
    <span className="ico" aria-hidden="true">
      <svg viewBox="0 0 24 24">{iconPaths[id]}</svg>
    </span>
  )
}

export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`chip ${tone}`}>{children}</span>
}

/** Small colored status dot. `color` is a CSS value, usually a token like var(--good). */
export function Dot({ color }: { color?: string }) {
  return <span className="dot" style={color ? ({ '--c': color } as CSSProperties) : undefined} />
}

export function Bar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="bar" style={color ? ({ '--c': color } as CSSProperties) : undefined}>
      <i style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }} />
    </div>
  )
}

export function Ring({ value, color }: { value: number; color: string }) {
  const r = 30
  const { dash, circumference } = ringDash(value, r)
  return (
    <svg className="ring" viewBox="0 0 72 72" role="img" aria-label={`${Math.round(value * 100)} percent`}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
      <circle
        cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`} transform="rotate(-90 36 36)"
      />
      <text x="36" y="41" textAnchor="middle" className="ring-label">{Math.round(value * 100)}%</text>
    </svg>
  )
}

export function Sparkline({
  points,
  color,
  label,
}: {
  points: { label: string; value: number }[]
  color: string
  label: string
}) {
  const g = sparkGeometry(points.map((p) => p.value))
  return (
    <svg viewBox={`0 0 ${g.width} ${g.height}`} className="spark" role="img" aria-label={label}>
      {g.gridLines.map((line) => (
        <g key={line.value}>
          <line x1={g.left} x2={g.right} y1={line.y} y2={line.y} stroke="var(--line)" />
          <text x={g.left - 6} y={line.y + 4} textAnchor="end" className="axis">{line.value}°</text>
        </g>
      ))}
      {points.map((p, i) =>
        i % 3 === 0 ? (
          <text key={p.label} x={g.x(i)} y={g.height - 6} textAnchor="middle" className="axis">{p.label}</text>
        ) : null,
      )}
      <polygon points={g.areaPoints} fill={color} opacity={0.18} />
      <polyline points={g.linePoints} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={g.x(0)} cy={g.y(points[0].value)} r={4.5} fill={color} />
    </svg>
  )
}

export function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="tog">
      <span>{label}</span>
      <button className="sw" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />
    </div>
  )
}

export function Card({
  title,
  chip,
  wide,
  color,
  children,
}: {
  title: ReactNode
  chip?: ReactNode
  wide?: boolean
  color?: string
  children: ReactNode
}) {
  return (
    <section className={`card${wide ? ' wide' : ''}`} style={color ? ({ '--c': color } as CSSProperties) : undefined}>
      <h3>
        {title}
        {chip}
      </h3>
      {children}
    </section>
  )
}

export function KV({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="kv">
      {rows.map(([k, v]) => (
        <div key={k} className="kv-row">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Idea({ children }: { children: ReactNode }) {
  return <p className="idea">{children}</p>
}

/** A pill linking out to an app or web page, with a round two-letter badge. */
export function AppLink({ href, name, mark, color }: { href: string; name: string; mark: string; color: string }) {
  return (
    // Web pages open in a new tab; an app link (shortcuts://) would leave an empty one behind.
    <a className="applink" href={href} {...(/^https?:/.test(href) ? { target: '_blank', rel: 'noreferrer' } : {})} aria-label={`Open ${name}`}>
      <span className="appmark" style={{ '--ac': color } as CSSProperties} aria-hidden="true">{mark}</span>
      <span>{name}</span>
      <span className="arrow" aria-hidden="true">↗</span>
    </a>
  )
}
