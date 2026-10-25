import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react'
import type { HouseState, Lock } from '../data/types'
import type { RunAction, UpdateHouse } from '../data/useHouse'
import { AppLink, Card, Chip, Dot, Idea, KV, Toggle } from '../widgets'
import { ConfirmButton } from '../widgets/ConfirmButton'
import type { Category } from './types'

// The tile opens the sheet when tapped, so its own buttons keep their taps to themselves.
const own = { onClick: (e: MouseEvent) => e.stopPropagation(), onKeyDown: (e: KeyboardEvent) => e.stopPropagation() }

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

function Bell() {
  return (
    <svg className="bell" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </svg>
  )
}

/**
 * The doorbell lives in Apple Home (Home Assistant would only get snapshots of it), so this
 * opens the Home app, where its live view is. Home only opens from an iPad, iPhone or Mac.
 */
function DoorbellButton({ href, big }: { href?: string; big?: boolean }) {
  const body = (
    <>
      <span className="ring"><Bell /></span>
      <span className="txt"><b>Doorbell</b><small>{href ? 'Live view in Apple Home' : 'Live view is in Apple Home on an iPad, iPhone or Mac'}</small></span>
      {href && <span className="arrow" aria-hidden="true">↗</span>}
    </>
  )
  const cls = `doorbell${big ? ' big' : ''}`
  return href
    ? <a className={cls} href={href} aria-label="Open the doorbell in Apple Home" {...own}>{body}</a>
    : <div className={`${cls} off`}>{body}</div>
}

/**
 * Blink takes the picture when asked, but Home Assistant only fetches it at its next check,
 * minutes later. So a few seconds after asking, the dashboard has Home Assistant fetch it,
 * then reloads the picture (its address stays the same, so the browser would keep the old one).
 */
function BlinkCam({ cam, run, notify }: { cam: HouseState['cameras'][number]; run: RunAction; notify: (m: string) => void }) {
  const [reload, setReload] = useState(0)
  const [waiting, setWaiting] = useState(false)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const snap = () => {
    run({ cameraSnap: true, camera: cam.id })
    notify(`Asking ${cam.name} for a new picture`)
    setWaiting(true)
    timers.current.push(
      window.setTimeout(() => run({ cameraRefresh: cam.id }), 6000),
      window.setTimeout(() => setReload(Date.now()), 10000),
      window.setTimeout(() => { run({ cameraRefresh: cam.id }); setWaiting(false) }, 20000),
      window.setTimeout(() => setReload(Date.now()), 24000),
    )
  }
  const src = cam.image && reload && !cam.image.startsWith('data:') ? `${cam.image}${cam.image.includes('?') ? '&' : '?'}reload=${reload}` : cam.image
  return (
    <div className="cam-card">
      <div className="cam">
        {src && <img src={src} alt={`${cam.name} camera`} />}
        <span>{cam.name}{cam.shotAt ? ` · picture ${cam.shotAt}` : ''}</span>
      </div>
      <div className="cam-foot">
        <span>{cam.lastMotion ? `Motion ${cam.lastMotion}` : 'No motion today'}</span>
        <button className="btn sm" disabled={waiting} onClick={snap}>{waiting ? 'Taking picture…' : 'New picture'}</button>
      </div>
    </div>
  )
}

function StatusList({ house, update, notify }: { house: HouseState; update: UpdateHouse; notify: (m: string) => void }) {
  return (
    <div className="list">
      {house.safety.locks.map((l) => (
        <div key={l.id} className="lock-row">
          <Dot color={`var(--${lockTone(l) === 'neutral' ? 'faint' : lockTone(l)})`} /><span className="n">{l.name}</span>
          <span className="r">{lockWords[l.state]}</span>
          <span {...own}><LockButtons lock={l} update={update} notify={notify} small /></span>
        </div>
      ))}
      <div><Dot color={house.safety.garage.open ? 'var(--warn)' : 'var(--good)'} />Garage door<span className="r">{house.safety.garage.open ? 'Open' : 'Closed'}</span></div>
      {house.safety.leaks.map((l) => (
        <div key={l.name}><Dot color={l.wet ? 'var(--bad)' : 'var(--good)'} />Leak · {l.name.toLowerCase()}<span className="r">{l.wet ? 'Wet' : 'Dry'}</span></div>
      ))}
      <div><Dot color={house.camerasArmed ? 'var(--good)' : 'var(--warn)'} />Blink cameras<span className="r">{house.camerasArmed ? 'Armed' : 'Off'}</span></div>
    </div>
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
  Tile: ({ house, update, notify, appUrl }) => (
    <div className="safety-side">
      <DoorbellButton href={appUrl('home')} />
      <StatusList house={house} update={update} notify={notify} />
    </div>
  ),
  Sheet: ({ house, update, run, notify, appUrl }) => {
    const g = house.safety.garage
    const stillOn = [
      ...house.rooms.filter((r) => r.lightsOn > 0).map((r) => `${r.name} lights`),
      ...house.media.screens.filter((s) => s.on).map((s) => s.name),
    ]
    const home = appUrl('home')
    const blink = appUrl('blink')
    // Only the Blink app has live view; on a laptop the Blink link is a Home Assistant page.
    const blinkLive = blink && !/^https?:/.test(blink) ? blink : undefined
    return (
      <>
        <Card wide color="var(--safety)" title="Blink cameras" chip={<Chip tone={house.camerasArmed ? 'good' : 'warn'}>{house.camerasArmed ? 'Armed' : 'Off'}</Chip>}>
          <div className="cams big">
            {house.cameras.map((c) => <BlinkCam key={c.id} cam={c} run={run} notify={notify} />)}
          </div>
          <div className="cam-actions">
            <Toggle label="Arm system" on={house.camerasArmed} onChange={(on) => update((h) => { h.camerasArmed = on })} />
            {blinkLive && <AppLink href={blinkLive} name="Live view in Blink" mark="Bl" color="var(--safety)" />}
          </div>
          <Idea>Blink only sends Home Assistant still pictures, so live video stays in the Blink app. Each new picture uses a little camera battery.</Idea>
        </Card>
        <Card color="var(--safety)" title="Doorbell">
          <DoorbellButton href={home} big />
          <Idea>The ecobee doorbell stays in Apple Home, which has its live video, sound and recordings. The ecobee app has them too.</Idea>
        </Card>
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
