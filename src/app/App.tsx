import { useCallback, useState, type CSSProperties } from 'react'
import { categories } from '../categories'
import type { CategoryId } from '../data/types'
import { useHouse, type Link } from '../data/useHouse'
import { liveAllowed } from '../ha/connection'
import { Settings } from '../ha/Settings'
import { Chip, Icon } from '../widgets'
import { Clock } from './Clock'
import { Rail } from './Rail'
import { Sheet } from './Sheet'
import { Toast } from './Toast'

export function App() {
  const { house, update, link } = useHouse()
  const [open, setOpen] = useState<CategoryId | 'settings' | null>(null)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const notify = useCallback((text: string) => setToast({ id: Date.now(), text }), [])
  const props = { house, update, notify }
  const openCategory = categories.find((c) => c.id === open)

  return (
    <div className="wrap">
      <header className="top">
        <Clock />
        <span className={`sample ${link.status}`}>{linkLabel(link)}</span>
        {liveAllowed && <button className="gear" onClick={() => setOpen('settings')}>Settings</button>}
      </header>

      <Rail house={house} update={update} />

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
          const className = `tile${c.wide ? ' w2' : ''}`
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

      {openCategory?.Sheet && (
        <Sheet id={openCategory.id} title={openCategory.name} onClose={() => setOpen(null)}>
          <openCategory.Sheet {...props} />
        </Sheet>
      )}
      {open === 'settings' && <Settings link={link} onClose={() => setOpen(null)} />}
      {toast && <Toast key={toast.id} text={toast.text} onDone={() => setToast(null)} />}
    </div>
  )
}

function linkLabel(link: Link): string {
  switch (link.status) {
    case 'sample': return 'Sample data'
    case 'connecting': return 'Connecting to Home Assistant…'
    case 'error': return "Can't reach Home Assistant · showing sample data"
    case 'live': return link.linked === link.total ? 'Live' : `Live · ${link.linked} of ${link.total} linked, rest is sample`
  }
}
