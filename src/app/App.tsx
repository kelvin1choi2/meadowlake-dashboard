import { useState, type CSSProperties } from 'react'
import { categories } from '../categories'
import type { CategoryId, FetchHistory, HouseState } from '../data/types'
import type { HistoryChart } from '../categories/types'
import type { Link, RunAction, UpdateHouse } from '../data/useHouse'
import { liveAllowed } from '../ha/connection'
import { Settings } from '../ha/Settings'
import { AppLink, Chip, Icon } from '../widgets'
import { appHref, apps, deviceKind, type AppId } from '../apps/apps'
import { windowsHelperOn } from '../apps/helper'
import { Clock } from './Clock'
import { Rail } from './Rail'
import { PlayerBar } from '../widgets/PlayerBar'
import { Alerts } from './Alerts'
import { History } from './History'
import { Leaving } from './Leaving'
import { Sheet } from './Sheet'
import { themes, type Theme } from './theme'
import { views, type View } from './view'

export interface AppProps {
  house: HouseState
  update: UpdateHouse
  run: RunAction
  history: FetchHistory
  link: Link
  notify: (message: string) => void
  view: View
  onView: (view: View) => void
  theme: Theme
  onTheme: (theme: Theme) => void
}

const device = deviceKind(navigator.userAgent, navigator.platform, navigator.maxTouchPoints, windowsHelperOn())

export function App({ house, update, run, history, link, notify, view, onView, theme, onTheme }: AppProps) {
  const [open, setOpen] = useState<CategoryId | 'settings' | 'leaving' | null>(null)
  const [chart, setChart] = useState<HistoryChart | null>(null)
  const appUrl = (id: AppId) => appHref(id, window.location.href, link.status === 'live' ? link.haUrl : undefined, device)
  const props = { house, update, run, notify, showHistory: setChart, appUrl }
  const openCategory = categories.find((c) => c.id === open)

  return (
    <div className="wrap">
      <header className="top">
        <Clock />
        <span className={`sample ${link.status}`}>{linkLabel(link)}</span>
        <div className="views" role="group" aria-label="Screen layout">
          {views.map((v) => (
            <button key={v.id} className="view-btn" aria-pressed={view === v.id} onClick={() => onView(v.id)}>{v.label}</button>
          ))}
        </div>
        <div className="views" role="group" aria-label="Colors">
          {themes.map((t) => (
            <button key={t.id} className="view-btn" aria-pressed={theme === t.id} onClick={() => onTheme(t.id)}>{t.label}</button>
          ))}
        </div>
        {liveAllowed && <button className="gear" onClick={() => setOpen('settings')}>Settings</button>}
      </header>

      <Alerts house={house} appUrl={appUrl} />
      <Rail house={house} update={update} onLeave={() => setOpen('leaving')} />

      <main className="grid">
        {categories.map((c) => {
          const status = c.status(house)
          const style = { '--c': `var(--${c.id})` } as CSSProperties
          const body = (
            <>
              <div className="th">
                <Icon id={c.id} />
                <h2>{c.name}</h2>
                {status && <Chip tone={status.tone}>{status.label}</Chip>}
              </div>
              <c.Tile {...props} />
              {c.Sheet && <span className="more">Tap for everything</span>}
            </>
          )
          const className = `tile${c.full ? ' w4' : c.wide ? ' w2' : ''}`
          return c.Sheet ? (
            <div key={c.id} role="button" tabIndex={0} className={`${className} tappable`} style={style}
              aria-label={`Open ${c.name}`}
              onClick={() => setOpen(c.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(c.id) } }}>
              {body}
            </div>
          ) : (
            <section key={c.id} className={className} style={style} aria-label={c.name}>{body}</section>
          )
        })}
      </main>

      <PlayerBar players={house.media.players} run={run} />

      {openCategory?.Sheet && (
        <Sheet id={openCategory.id} title={openCategory.name} onClose={() => setOpen(null)}
          apps={(openCategory.apps ?? []).flatMap((id) => {
            const href = appUrl(id)
            const a = apps[id]
            return href ? [<AppLink key={id} href={href} name={a.name} mark={a.mark} color={`var(--${a.hue})`} />] : []
          })}>
          <openCategory.Sheet {...props} />
        </Sheet>
      )}
      {open === 'settings' && <Settings link={link} onClose={() => setOpen(null)} />}
      {open === 'leaving' && <Leaving house={house} update={update} run={run} notify={notify} onClose={() => setOpen(null)} />}
      {chart && <History chart={chart} history={history} onClose={() => setChart(null)} />}
    </div>
  )
}

export function linkLabel(link: Link): string {
  switch (link.status) {
    case 'sample': return 'Sample data'
    case 'connecting': return 'Connecting to Home Assistant…'
    case 'error': return "Can't reach Home Assistant · showing sample data"
    case 'live': {
      const off = link.unavailable.length
      const sample = link.onSample.length
      const notes = [off && `${off} unavailable`, sample && `${sample} on sample data`].filter(Boolean)
      return notes.length ? `Live · ${notes.join(', ')}` : 'Live'
    }
  }
}
