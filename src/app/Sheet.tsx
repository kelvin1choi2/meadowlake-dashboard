import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import type { CategoryId } from '../data/types'
import { Icon } from '../widgets'

export function Sheet({ id, title, onClose, apps, children }: { id?: CategoryId; title: string; onClose: () => void; apps?: ReactNode[]; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [onClose])

  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} style={id ? ({ '--c': `var(--${id})` } as CSSProperties) : undefined}>
        <div className="sh">
          {id && <Icon id={id} />}
          <h2>{title}</h2>
          {apps && apps.length > 0 && <div className="sh-apps"><span className="lbl">Open in</span>{apps}</div>}
          <button ref={closeRef} className="x" onClick={onClose}>Close</button>
        </div>
        <div className="sb">{children}</div>
      </div>
    </div>
  )
}
