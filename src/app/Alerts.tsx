import { useEffect, useState } from 'react'
import type { AppId } from '../apps/apps'
import type { HouseState } from '../data/types'
import { houseAlerts, visibleAlerts } from './alerts'

// Banners across the top for things that need a look: leaks, failed backups, the garage left
// open, a finished wash, a nearly full volume. Each can be snoozed or dismissed; a dismissal
// covers that one report only, so the next failure of the same task shows again.

const dismissedKey = 'meadowlake.dismissed'
const snoozedKey = 'meadowlake.snoozed'

function load<T>(key: string, fallback: T, ok: (v: unknown) => v is T): T {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
    return ok(v) ? v : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode: it holds until reload */ }
}

const isList = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')
const isMap = (v: unknown): v is Record<string, number> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every((x) => typeof x === 'number')

/** Re-renders once a minute, so a snooze runs out on its own. */
function useMinuteTick() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function Alerts({ house, appUrl }: { house: HouseState; appUrl: (id: AppId) => string | undefined }) {
  const [dismissed, setDismissed] = useState(() => load(dismissedKey, [], isList))
  const [snoozed, setSnoozed] = useState(() => load(snoozedKey, {}, isMap))
  const now = useMinuteTick()
  const shown = visibleAlerts(houseAlerts(house), dismissed, snoozed, now)
  if (!shown.length) return null

  const dismiss = (id: string) => {
    const next = [...dismissed, id].slice(-50)
    setDismissed(next)
    save(dismissedKey, next)
  }
  const snooze = (id: string, minutes: number) => {
    const t = Date.now()
    const next = Object.fromEntries([...Object.entries(snoozed).filter(([, until]) => until > t), [id, t + minutes * 60_000]])
    setSnoozed(next)
    save(snoozedKey, next)
  }

  return (
    <div className="alerts">
      {shown.map((a) => (
        <div key={a.id} className={`alert ${a.tone}`} role={a.tone === 'bad' ? 'alert' : 'status'}>
          <div>
            <b>{a.title}</b>
            <span>{a.detail}</span>
          </div>
          <div className="alert-btns">
            {a.buttons.map((b) => {
              if ('snooze' in b) return <button key="snooze" className="btn" onClick={() => snooze(a.id, b.snooze)}>Snooze {b.snooze} min</button>
              if ('dismiss' in b) return <button key="dismiss" className="btn" onClick={() => dismiss(a.id)}>Dismiss</button>
              const href = appUrl(b.app)
              if (!href) return null
              const web = /^https?:/.test(href)
              return (
                <a key={b.app} className="btn" href={web && b.launch ? href.replace(/\/?$/, '/') + b.launch : href}
                  {...(web ? { target: '_blank', rel: 'noreferrer' } : {})}>
                  {b.label} <span aria-hidden="true">↗</span>
                </a>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
