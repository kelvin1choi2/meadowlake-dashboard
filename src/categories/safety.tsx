import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react'
import type { Lock } from '../data/types'
import type { UpdateHouse } from '../data/useHouse'
import { Card, Chip, Dot, Idea, KV } from '../widgets'
import { ConfirmButton } from '../widgets/ConfirmButton'
import type { Category } from './types'

// The tile opens the sheet when tapped, so its own buttons keep their taps to themselves.
const own = { onClick: (e: MouseEvent) => e.stopPropagation(), onKeyDown: (e: KeyboardEvent) => e.stopPropagation() }

// MOCKUP ONLY: ?lock=a|b|c picks a tile design for Kelvin to choose from.
const variant = typeof location === 'undefined' ? 'b' : new URLSearchParams(location.search).get('lock') ?? 'b'

const lockWords: Record<Lock['state'], string> = {
  locked: 'Locked', unlocked: 'Unlocked', locking: 'Locking…', unlocking: 'Unlocking…', jammed: 'Jammed', open: 'Open', unknown: 'Not answering',
}
const lockTone = (l: Lock) => (l.state === 'locked' ? 'good' : l.state === 'jammed' ? 'bad' : l.state === 'unknown' ? 'neutral' : 'warn')
/** It can be locked or unlocked from here (not while the bolt is moving or the lock is offline). */
const canMove = (l: Lock) => l.state === 'locked' || l.state === 'unlocked' || l.state === 'jammed' || l.state === 'open'

function setLock(update: UpdateHouse, notify: (m: string) => void, lock: Lock, to: 'locked' | 'unlocked') {
  update((h) => { const l = h.safety.locks.find((x) => x.id === lock.id); if (l) l.state = to })
  notify(`${to === 'locked' ? 'Locking' : 'Unlocking'} ${lock.name.toLowerCase()}`)
}

function Padlock({ open }: { open: boolean }) {
  return (
    <svg className="padlock" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d={open ? 'M8.5 10.5V7.5a3.5 3.5 0 0 1 6.8-1.2' : 'M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3'} />
      <path d="M12 14.5v2" />
    </svg>
  )
}

/** Locking is one tap; unlocking takes a second tap within a few seconds. */
function LockButtons({ lock, update, notify, small }: { lock: Lock; update: UpdateHouse; notify: (m: string) => void; small?: boolean }) {
  if (!canMove(lock)) return <button type="button" className={`btn${small ? ' sm' : ''}`} disabled>{lockWords[lock.state]}</button>
  return lock.state === 'locked'
    ? <ConfirmButton small={small} confirm={small ? "Tap again" : "Tap again to unlock"} onConfirm={() => setLock(update, notify, lock, 'unlocked')}>Unlock</ConfirmButton>
    : <button type="button" className={`btn primary${small ? ' sm' : ''}`} onClick={() => setLock(update, notify, lock, 'locked')}>Lock</button>
}

/** Mockup B: a big button that shows the lock's state. Tap locks; unlocking needs a second tap. */
function BigLock({ lock, update, notify }: { lock: Lock; update: UpdateHouse; notify: (m: string) => void }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])
  const locked = lock.state === 'locked' || lock.state === 'locking'
  const tap = (e: MouseEvent) => {
    own.onClick(e)
    if (!canMove(lock)) return
    if (lock.state !== 'locked') return setLock(update, notify, lock, 'locked')
    if (!armed) return setArmed(true)
    setArmed(false)
    setLock(update, notify, lock, 'unlocked')
  }
  const hint = !canMove(lock) ? lockWords[lock.state] : lock.state !== 'locked' ? 'Tap to lock' : armed ? 'Tap again to unlock' : 'Tap twice to unlock'
  return (
    <button type="button" className={`biglock ${lockTone(lock)}${armed ? ' armed' : ''}`} onClick={tap} onKeyDown={own.onKeyDown}
      aria-label={`${lock.name}: ${lockWords[lock.state]}. ${hint}.`}>
      <span className="ring"><Padlock open={!locked} /></span>
      <span className="txt"><b>{lock.name}</b><span>{lockWords[lock.state]} · {hint}</span></span>
    </button>
  )
}

/** Mockup C: tap locks; unlocking is press and hold while the bar fills. */
function HoldLock({ lock, update, notify }: { lock: Lock; update: UpdateHouse; notify: (m: string) => void }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const stop = () => { clearTimeout(timer.current); setHolding(false) }
  const locked = lock.state === 'locked'
  return (
    <button type="button" className={`biglock hold ${lockTone(lock)}${holding ? ' holding' : ''}`} onKeyDown={own.onKeyDown}
      onClick={(e) => { own.onClick(e); if (canMove(lock) && !locked) setLock(update, notify, lock, 'locked') }}
      onPointerDown={() => { if (!locked) return; setHolding(true); timer.current = setTimeout(() => { setHolding(false); setLock(update, notify, lock, 'unlocked') }, 1500) }}
      onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onContextMenu={(e) => e.preventDefault()}>
      <span className="ring"><Padlock open={!locked} /></span>
      <span className="txt"><b>{lock.name}</b><span>{lockWords[lock.state]} · {locked ? 'Hold to unlock' : canMove(lock) ? 'Tap to lock' : ''}</span></span>
      <i className="fill" />
    </button>
  )
}

export const safety: Category = {
  id: 'safety',
  name: 'Safety',
  apps: ['home', 'blink', 'smartthings'],
  status: (h) => {
    if (h.safety.leaks.some((l) => l.wet)) return { tone: 'bad', label: 'Leak!' }
    if (h.safety.locks.some((l) => l.state === 'jammed')) return { tone: 'bad', label: 'Lock jammed' }
    if (h.safety.garage.open) return { tone: 'warn', label: 'Garage open' }
    if (h.safety.locks.some((l) => l.state === 'unlocked' || l.state === 'open')) return { tone: 'warn', label: 'Unlocked' }
    return { tone: 'good', label: 'All clear' }
  },
  Tile: ({ house, update, notify }) => (
    <>
      {variant !== 'a' && house.safety.locks.map((l) => variant === 'c'
        ? <HoldLock key={l.id} lock={l} update={update} notify={notify} />
        : <BigLock key={l.id} lock={l} update={update} notify={notify} />)}
      <div className="list">
        {variant === 'a' && house.safety.locks.map((l) => (
          <div key={l.id} className="lock-row">
            <Dot color={`var(--${lockTone(l) === 'neutral' ? 'faint' : lockTone(l)})`} />{l.name}
            <span className="r">{lockWords[l.state]}</span>
            <span {...own}><LockButtons lock={l} update={update} notify={notify} small /></span>
          </div>
        ))}
        <div><Dot color={house.safety.garage.open ? 'var(--warn)' : 'var(--good)'} />Garage door<span className="r">{house.safety.garage.open ? 'Open' : 'Closed'}</span></div>
        {house.safety.leaks.map((l) => (
          <div key={l.name}><Dot color={l.wet ? 'var(--bad)' : 'var(--good)'} />Leak · {l.name.toLowerCase()}<span className="r">{l.wet ? 'Wet' : 'Dry'}</span></div>
        ))}
        <div><Dot color={house.camerasArmed ? 'var(--good)' : 'var(--warn)'} />Cameras<span className="r">{house.camerasArmed ? 'Armed' : 'Off'}</span></div>
      </div>
    </>
  ),
  Sheet: ({ house, update, notify }) => {
    const g = house.safety.garage
    const stillOn = [
      ...house.rooms.filter((r) => r.lightsOn > 0).map((r) => `${r.name} lights`),
      ...house.media.screens.filter((s) => s.on).map((s) => s.name),
    ]
    return (
      <>
        {house.safety.locks.map((l) => (
          <Card key={l.id} color="var(--safety)" title={`${l.name} lock`} chip={<Chip tone={lockTone(l)}>{lockWords[l.state]}</Chip>}>
            <div className="lock-big" style={{ '--c': `var(--${lockTone(l) === 'neutral' ? 'faint' : lockTone(l)})` } as CSSProperties}>
              <span className="ring"><Padlock open={l.state !== 'locked' && l.state !== 'locking'} /></span>
              <LockButtons lock={l} update={update} notify={notify} />
            </div>
            <KV rows={[
              [l.state === 'locked' ? 'Locked since' : 'Unlocked since', l.since],
              ...(l.doorOpen === undefined ? [] : [['Door', l.doorOpen ? 'Open' : 'Closed'] as [string, string]]),
              ...(l.battery === undefined ? [] : [['Battery', `${l.battery}%`] as [string, string]]),
            ]} />
            <Idea>Locking is one tap. Unlocking asks for a second tap, so a brush against the tablet can't open the door.</Idea>
          </Card>
        ))}
        <Card color="var(--safety)" title="Garage door" chip={<Chip tone={g.open ? 'warn' : 'good'}>{g.open ? 'Open' : 'Closed'}</Chip>}>
          <KV rows={[[g.open ? 'Open since' : 'Closed since', g.since]]} />
          <Idea>Opening and closing stays with the garage remote and Apple Home, so a stray tap here can't open it.</Idea>
        </Card>
        <Card color="var(--safety)" title="Leak detectors" chip={<Chip tone={house.safety.leaks.some((l) => l.wet) ? 'bad' : 'good'}>{house.safety.leaks.some((l) => l.wet) ? 'Wet' : 'Dry'}</Chip>}>
          <KV rows={house.safety.leaks.map((l): [string, string] => [l.name, l.battery === undefined ? (l.wet ? 'Wet' : 'Dry') : `${l.wet ? 'Wet' : 'Dry'} · battery ${l.battery}%`])} />
          <Idea>A leak turns the whole panel red and announces on every Alexa.</Idea>
        </Card>
        <Card color="var(--safety)" title="Leaving-home check">
          <div className="list">
            {stillOn.map((s) => <div key={s}><Dot color="var(--warn)" />{s}<span className="r">On</span></div>)}
            {house.safety.locks.map((l) => <div key={l.id}><Dot color={l.state === 'locked' ? 'var(--good)' : 'var(--warn)'} />{l.name}<span className="r">{lockWords[l.state]}</span></div>)}
            <div><Dot color="var(--good)" />Oven, garage<span className="r">{house.appliances.range.oven}, {g.open ? 'open' : 'closed'}</span></div>
          </div>
        </Card>
      </>
    )
  },
}
