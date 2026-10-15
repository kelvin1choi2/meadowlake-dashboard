import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import type { CategoryId } from '../data/types'
import { Icon } from '../widgets'

export function Sheet({ id, title, onClose, children }: { id: CategoryId; title: string; onClose: () => void; children: ReactNode }) {
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
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} style={{ '--c': `var(--${id})` } as CSSProperties}>
        <div className="sh">
          <Icon id={id} />
          <h2>{title}</h2>
          <button ref={closeRef} className="x" onClick={onClose}>Close</button>
        </div>
        <div className="sb">{children}</div>
      </div>
    </div>
  )
}
