import { useCallback, useState, type ReactNode } from 'react'
import { useHouse } from '../data/useHouse'
import { Saver } from '../saver/Saver'
import { useStageFit } from '../widgets/useStageFit'
import { App } from './App'
import { useTheme } from './theme'
import { Toast } from './Toast'
import { loadView, saveView, type View } from './view'

/** Holds the house connection, so switching layouts never reconnects to Home Assistant. */
export function Root() {
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const notify = useCallback((text: string) => setToast({ id: Date.now(), text }), [])
  const live = useHouse(notify)
  const [view, setView] = useState(loadView)
  const [theme, setTheme] = useTheme()
  // Where the screensaver goes back to when it's dismissed.
  const [back, setBack] = useState<View>(() => (view === 'saver' ? 'standard' : view))

  const choose = (next: View) => {
    if (next === 'saver' && view !== 'saver') setBack(view)
    setView(next)
    saveView(next)
  }

  if (view === 'saver') return <Saver {...live} onExit={() => choose(back)} />

  const page = (
    <>
      <App {...live} notify={notify} view={view} onView={choose} theme={theme} onTheme={setTheme} />
      {toast && <Toast key={toast.id} text={toast.text} onDone={() => setToast(null)} />}
    </>
  )
  return view === 'wall' ? <Wall>{page}</Wall> : page
}

const WALL = { w: 1600, h: 1000 }

/**
 * The 16:10 view: the standard dashboard laid out at a fixed 1600-wide size and scaled to fill the
 * screen, so a big monitor gets bigger tiles instead of more empty space. If the content runs
 * taller than 16:10 it shrinks to fit, so nothing ever scrolls.
 */
function Wall({ children }: { children: ReactNode }) {
  const { ref, fit } = useStageFit(WALL.w, WALL.h)
  return (
    <div className="stage-frame">
      <div ref={ref} className="wall-stage" style={{ width: WALL.w, minHeight: WALL.h, transform: `translate(${fit.x}px, ${fit.y}px) scale(${fit.scale})` }}>
        {children}
      </div>
    </div>
  )
}
