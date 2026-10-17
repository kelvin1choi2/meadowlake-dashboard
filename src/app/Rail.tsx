import type { HouseState } from '../data/types'
import type { UpdateHouse } from '../data/useHouse'
import { Dot } from '../widgets'

const modes: { id: HouseState['mode']; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'away', label: 'Away' },
  { id: 'night', label: 'Night' },
  { id: 'guests', label: 'Guests' },
]

/** `onLeave` opens the Leaving check, which tapping Away does when coming from another mode. */
export function Rail({ house, update, onLeave }: { house: HouseState; update: UpdateHouse; onLeave: () => void }) {
  const events = house.pulse.map((e, i) => (
    <span key={`${i}-${e.who}`} className="ev">
      <Dot color={`var(--${e.category})`} />
      <b>{e.who}</b> {e.what} <span className="num">{e.at}</span>
    </span>
  ))
  const w = house.weather
  return (
    <div className="rail">
      <div className="modes" role="group" aria-label="House mode">
        {modes.map((m) => (
          <button key={m.id} className="mode" aria-pressed={house.mode === m.id} onClick={() => (m.id === 'away' && house.mode !== 'away' ? onLeave() : update((h) => { h.mode = m.id }))}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="pulse" aria-label="Recent house events">
        <span className="lbl">Pulse</span>
        <div className="pulse-window">
          {/* Rendered twice so the scroll loops without a gap. */}
          <div className="track">{events}<span aria-hidden="true" className="track-copy">{events}</span></div>
        </div>
      </div>
      <div className="wx">
        <span className="big num">{w.tempF}°</span>
        <div className="wx-text">
          <div>{w.condition}</div>
          <div className="muted">H {w.high}° · L {w.low}°{w.aqi !== undefined && ` · AQI ${w.aqi}`}</div>
        </div>
      </div>
    </div>
  )
}
