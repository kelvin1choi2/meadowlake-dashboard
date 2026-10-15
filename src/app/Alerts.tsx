import { useState } from 'react'
import type { HouseState } from '../data/types'

// Failed backup and sync tasks, as banners across the top until dismissed. A dismissal
// covers that one report only: the next failure of the same task shows again.

const key = 'meadowlake.dismissed'

function load(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function Alerts({ house }: { house: HouseState }) {
  const [dismissed, setDismissed] = useState(load)
  const failed = house.nas.tasks.filter((t) => t.ok === false && !dismissed.includes(t.reportId))
  if (!failed.length) return null

  const dismiss = (id: string) => {
    const next = [...dismissed, id].slice(-50)
    setDismissed(next)
    try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* private mode: it stays dismissed until reload */ }
  }

  return (
    <div className="alerts">
      {failed.map((t) => (
        <div key={t.reportId} className="alert" role="alert">
          <div>
            <b>{t.name} failed</b>
            <span>{t.app} · {t.when}{t.detail ? ` · ${t.detail}` : ''}</span>
          </div>
          <button className="btn" onClick={() => dismiss(t.reportId)}>Dismiss</button>
        </div>
      ))}
    </div>
  )
}
