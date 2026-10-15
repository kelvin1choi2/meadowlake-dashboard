import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Clock } from '../app/Clock'
import { linkLabel } from '../app/App'
import { categories } from '../categories'
import type { HouseState } from '../data/types'
import { useHouse } from '../data/useHouse'
import { Bar, Chip, Dot, Icon } from '../widgets'
import { burnInShift, fitStage } from '../widgets/geometry'
import { nextSpotlight, spotlightPlan, type Slot } from './spotlight'

// The 10-foot view (open the dashboard with ?tv). Built for a 1920×1080 stage and scaled to
// whatever screen it lands on. It is display-only: one tile at a time is shown large and the
// spotlight moves on by itself, with weather, what's playing and the house pulse alongside.

const STAGE = { w: 1920, h: 1080 }
/** Scenes are buttons, which mean nothing on a screen nobody touches. */
const shown = categories.filter((c) => c.id !== 'scenes')
const noop = () => {}

export function TvApp() {
  const { house, update, run, link } = useHouse()
  const now = useMinute()
  const fit = useStageFit()

  const plan = spotlightPlan(shown.map((c) => ({ id: c.id, tone: c.status(house)?.tone ?? null })))
  const planRef = useRef(plan)
  planRef.current = plan
  const [slot, setSlot] = useState<Slot | null>(() => plan[0] ?? null)
  useEffect(() => {
    if (!slot) return
    const t = setTimeout(() => setSlot(nextSpotlight(planRef.current, slot.id)), slot.seconds * 1000)
    return () => clearTimeout(t)
  }, [slot])

  const hero = shown.find((c) => c.id === slot?.id) ?? shown[0]
  const status = hero.status(house)
  const shift = burnInShift(now.getHours() * 60 + now.getMinutes())
  const hour = now.getHours()
  const night = hour >= 23 || hour < 6
  const stage = {
    width: STAGE.w,
    height: STAGE.h,
    transform: `translate(${fit.x + shift.x * fit.scale}px, ${fit.y + shift.y * fit.scale}px) scale(${fit.scale})`,
  }

  return (
    <div className={`tv${night ? ' night' : ''}`}>
      <div className="tv-stage" style={stage}>
        <header className="tv-top">
          <Clock />
          <span className="tv-mode">{house.mode[0].toUpperCase() + house.mode.slice(1)}</span>
          <span className={`sample ${link.status}`}>{linkLabel(link)}</span>
        </header>

        <main className="tv-main">
          <section key={hero.id} className="tile tv-hero" style={{ '--c': `var(--${hero.id})` } as CSSProperties} aria-label={hero.name} inert>
            <div className="th">
              <Icon id={hero.id} />
              <h2>{hero.name}</h2>
              {status && <Chip tone={status.tone}>{status.label}</Chip>}
            </div>
            <div className="tv-zoom">
              <hero.Tile house={house} update={update} run={run} notify={noop} />
            </div>
          </section>

          <aside className="tv-side">
            <Failures house={house} />
            <Weather house={house} />
            <NowPlaying house={house} />
            <Pulse house={house} />
          </aside>
        </main>

        <nav className="tv-strip" aria-label="Rotation">
          {shown.map((c) => {
            const s = c.status(house)
            const active = c.id === hero.id
            return (
              <div key={c.id} className={`tv-chip${active ? ' on' : ''}`} style={{ '--c': `var(--${c.id})` } as CSSProperties}>
                <Icon id={c.id} />
                <div>
                  <b>{c.name}</b>
                  {s && <span className={`tone ${s.tone}`}>{s.label}</span>}
                </div>
                {active && slot && <i key={`${c.id}-${slot.seconds}`} className="tv-timer" style={{ animationDuration: `${slot.seconds}s` }} />}
              </div>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

function Failures({ house }: { house: HouseState }) {
  const failed = house.nas.tasks.filter((t) => t.ok === false)
  return failed.map((t) => (
    <div key={t.reportId} className="alert">
      <div>
        <b>{t.name} failed</b>
        <span>{t.app} · {t.when}</span>
      </div>
    </div>
  ))
}

function Weather({ house }: { house: HouseState }) {
  const w = house.weather
  return (
    <section className="tv-card" style={{ '--c': 'var(--outside)' } as CSSProperties}>
      <div className="tv-wx">
        <span className="tv-big num">{w.tempF}°</span>
        <div>
          <b>{w.condition}</b>
          <span className="muted">H {w.high}° · L {w.low}° · feels {w.feelsF}°</span>
        </div>
      </div>
      <div className="fc">
        {w.daily.slice(0, 5).map((d) => (
          <div key={d.day} className="d">{d.day}<b className="num">{d.high}°</b><span className="num">{d.low}°</span></div>
        ))}
      </div>
    </section>
  )
}

function NowPlaying({ house }: { house: HouseState }) {
  const playing = house.media.players.filter((p) => p.state === 'playing').slice(0, 2)
  return (
    <section className="tv-card" style={{ '--c': 'var(--media)' } as CSSProperties}>
      <div className="lbl">Now playing</div>
      {playing.length ? playing.map((p) => (
        <div key={p.id} className="tv-np">
          {p.art ? <img className="pb-art" src={p.art} alt="" /> : <div className="pb-art" />}
          <div className="pb-meta">
            <b>{p.title ?? p.name}</b>
            <span>{[p.subtitle, p.name].filter(Boolean).join(' · ')}</span>
            {p.progress !== undefined && <Bar value={p.progress} color="var(--media)" />}
          </div>
        </div>
      )) : <span className="muted">Nothing playing</span>}
    </section>
  )
}

function Pulse({ house }: { house: HouseState }) {
  return (
    <section className="tv-card tv-pulse">
      <div className="lbl">Pulse</div>
      {house.pulse.slice(0, 5).map((e, i) => (
        <div key={`${i}-${e.who}`} className="tv-ev">
          <Dot color={`var(--${e.category})`} />
          <span><b>{e.who}</b> {e.what}</span>
          <span className="num muted">{e.at}</span>
        </div>
      ))}
    </section>
  )
}

function useMinute(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  return now
}

function useStageFit() {
  const measure = () => fitStage(window.innerWidth, window.innerHeight, STAGE.w, STAGE.h)
  const [fit, setFit] = useState(measure)
  useEffect(() => {
    const onResize = () => setFit(measure())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return fit
}
