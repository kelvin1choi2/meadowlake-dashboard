import { useEffect, useState, type CSSProperties } from 'react'
import type { HouseState, PartyLights } from '../data/types'
import type { UpdateHouse } from '../data/useHouse'
import { Card, Chip } from '../widgets'

/** The color-change choices, in seconds. */
export const changeChoices = [30, 60, 90]

/** The cover the party lights take their colors from, when that zone has one. */
function followedArt(house: HouseState): string | undefined {
  const party = house.party
  return party ? house.media.roon.find((z) => z.id === party.follow)?.art : undefined
}

/** Seconds until the next color, from when the current one came up. */
export function secondsToNext(party: PartyLights, now: number): number | undefined {
  if (!party.colorSince || party.palette.length < 2) return undefined
  const left = party.changeSeconds - Math.floor((now - new Date(party.colorSince).getTime()) / 1000)
  return Math.max(0, left)
}

/** Which album colors are on the bars: one per bar when Home Assistant can split them (steady through
 *  the cloud, strobing over the home network), otherwise one for both. */
export function splitColors(party: PartyLights): number[] {
  const n = party.palette.length
  if (!n) return []
  if (!(party.strobe ? party.lan : party.split) || n < 2) return [party.colorIndex]
  return [party.colorIndex, (party.colorIndex + 1) % n]
}

/** The album's colors side by side with hard edges, so the bar shows no blended in-between colors. */
export function stripes(palette: string[]): string {
  const w = 100 / palette.length
  return `linear-gradient(90deg, ${palette.map((c, i) => `${c} ${(i * w).toFixed(2)}% ${((i + 1) * w).toFixed(2)}%`).join(', ')})`
}

function useNow(on: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!on) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [on])
  return now
}

function Seg<T extends string | number>({ label, value, options, onPick, disabled }: {
  label: string; value: T; options: [T, string][]; onPick: (v: T) => void; disabled?: boolean
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={String(v)} className={v === value ? 'on' : ''} aria-pressed={v === value} disabled={disabled} onClick={() => onPick(v)}>
          {text}
        </button>
      ))}
    </div>
  )
}

/**
 * Party lights (docs/party-lights.md): the album's colors as blocks with the one showing
 * outlined, then the controls. Strobing uses the bars' own mic, so it keeps the beat; the
 * colors move on every 30, 60 or 90 seconds and change with the album. Tapping a color puts it
 * on the bars now (and switches to album colors); the cycle carries on from there.
 */
export function PartyCard({ house, update }: { house: HouseState; update: UpdateHouse }) {
  const party = house.party!
  const now = useNow(party.on && party.albumColors)
  const [level, setLevel] = useState(party.sensitivity)
  useEffect(() => setLevel(party.sensitivity), [party.sensitivity])
  const set = (change: (p: PartyLights) => void) => update((h) => { if (h.party) change(h.party) })
  const art = followedArt(house)
  const next = party.on && party.albumColors ? secondsToNext(party, now) : undefined
  const ready = party.setUp && party.reachable
  // Steady with the cloud: each half of the bars shows its own color, this one and the next.
  const showing = splitColors(party)
  const chip = !party.reachable ? <Chip tone="bad">Not answering</Chip>
    : party.on ? <Chip tone="good">{party.strobe ? 'On · strobing' : 'On'}</Chip>
    : <Chip tone="neutral">Off</Chip>
  const commitLevel = () => { if (level !== party.sensitivity) set((p) => { p.sensitivity = level }) }

  return (
    <Card wide color="var(--media)" title={<>Party lights <span className="party-sub">{party.name} · colors from {party.followName}</span></>} chip={chip}>
      <div className="party-colors">
        {art ? <img className="party-art" src={art} alt="" /> : <div className="party-art" aria-hidden="true" />}
        {party.palette.length ? (
          <div className="party-blocks">
            {party.palette.map((c, i) => {
              const now = party.albumColors && showing.includes(i)
              return (
                <button key={i} className={now ? 'on' : ''} style={{ '--sw': c } as CSSProperties} disabled={!ready}
                  aria-pressed={now} aria-label={`Color ${i + 1} of ${party.palette.length}`}
                  onClick={() => set((p) => { p.colorIndex = i; p.albumColors = true })}>
                  {now ? 'Now' : ''}
                </button>
              )
            })}
          </div>
        ) : (
          <p className="party-empty">Play an album in {party.followName} and its colors show here.</p>
        )}
      </div>
      {party.palette.length > 0 && (
        <div className="party-bar" style={{ '--grad': stripes(party.palette) } as CSSProperties} />
      )}
      <div className="party-row">
        <label className="party-power">
          <button className="sw" role="switch" aria-checked={party.on} aria-label="Lights on" disabled={!party.reachable}
            onClick={() => set((p) => { p.on = !p.on })} />
          <b>Lights on</b>
        </label>
        <Seg label="Effect" value={party.strobe ? 'strobe' : 'steady'} disabled={!ready}
          options={[['strobe', 'Strobe to music'], ['steady', 'Steady']]} onPick={(v) => set((p) => { p.strobe = v === 'strobe' })} />
        <Seg label="Colors" value={party.albumColors ? 'album' : 'govee'} disabled={!ready}
          options={[['album', 'Album colors'], ['govee', 'Govee colors']]} onPick={(v) => set((p) => { p.albumColors = v === 'album' })} />
        {next !== undefined && <span className="party-note">Next color in {next} s · new colors when the album changes</span>}
      </div>
      <div className="party-row">
        <span className="lbl">Change every</span>
        <Seg label="Change every" value={party.changeSeconds} disabled={!ready}
          options={changeChoices.map((s): [number, string] => [s, `${s} s`])} onPick={(v) => set((p) => { p.changeSeconds = v })} />
        <label className="party-level">
          <span className="lbl">Mic sensitivity</span>
          <input type="range" min={0} max={100} step={5} value={level} disabled={!ready || !party.strobe}
            aria-label="Mic sensitivity" onChange={(e) => setLevel(Number(e.target.value))}
            onPointerUp={commitLevel} onKeyUp={commitLevel} onBlur={commitLevel} />
        </label>
      </div>
      {party.strobe && party.albumColors && party.lan && (
        <p className="party-note">Strobing in album colors uses Govee's Shiny style, one album color on each bar.</p>
      )}
      {party.setUp && party.strobe && party.albumColors && !party.lan && (
        <p className="party-note">To strobe in album colors only, add the bars' address in Home Assistant (docs/party-lights.md). Until then Govee mixes in its own colors.</p>
      )}
      {!(party.strobe && party.albumColors && party.lan) && party.style && party.styles && party.styles.length > 1 && (
        <div className="party-row">
          <span className="lbl">Strobe style</span>
          <Seg label="Strobe style" value={party.style} disabled={!ready || !party.strobe}
            options={party.styles.map((s): [string, string] => [s, s])}
            onPick={(v) => set((p) => { p.style = v })} />
        </div>
      )}
      {!party.setUp && (
        <p className="party-note">Strobe and album colors need the Home Assistant part set up first (docs/party-lights.md). On and off work already.</p>
      )}
      {party.setUp && !party.cloud && party.strobe && (
        <p className="party-note">Strobing goes through Govee's cloud, and Home Assistant hasn't found the bars there yet. Check the Govee API key (docs/party-lights.md).</p>
      )}
    </Card>
  )
}
