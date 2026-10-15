import { useEffect, useState } from 'react'
import type { Player, PlayerCommand } from '../data/types'
import type { RunAction } from '../data/useHouse'

// A full-width playback bar, under the tiles and in the Media sheet: pick any media player, then play, skip,
// change volume or switch it on and off.

const remembered = 'meadowlake.player'

function load(): string | null {
  try { return localStorage.getItem(remembered) } catch { return null }
}

function save(id: string) {
  try { localStorage.setItem(remembered, id) } catch { /* private mode: just don't remember */ }
}

const icons = {
  previous: <path d="M6 5h2v14H6zM20 5v14L9 12z" />,
  next: <path d="M16 5h2v14h-2zM4 5v14l11-7z" />,
  play: <path d="M7 4v16l13-8z" />,
  pause: <path d="M6 4h4v16H6zM14 4h4v16h-4z" />,
  volume: <path d="M4 9v6h4l5 4V5L8 9zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" />,
  muted: <path d="M4 9v6h4l5 4V5L8 9zm16.6 0L19 7.4 16.5 10 14 7.4 12.4 9l2.6 2.5-2.6 2.5 1.6 1.6 2.5-2.6 2.5 2.6 1.6-1.6-2.6-2.5z" />,
  power: <path d="M11 3h2v9h-2zm6.4 2.6-1.4 1.4A6 6 0 1 1 8 7L6.6 5.6a8 8 0 1 0 10.8 0z" />,
}

function Btn({ label, icon, disabled, onClick, main }: { label: string; icon: keyof typeof icons; disabled?: boolean; onClick: () => void; main?: boolean }) {
  return (
    <button className={`pb-btn${main ? ' main' : ''}`} aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      <svg viewBox="0 0 24 24" aria-hidden="true">{icons[icon]}</svg>
    </button>
  )
}

const stateLabel = { playing: 'Playing', paused: 'Paused', idle: 'Idle', off: 'Off' }

export function PlayerBar({ players, run }: { players: Player[]; run: RunAction }) {
  const [chosen, setChosen] = useState<string | null>(load)
  const player = players.find((p) => p.id === chosen) ?? players.find((p) => p.state === 'playing') ?? players[0]
  const [volume, setVolume] = useState<number | null>(null)
  useEffect(() => setVolume(null), [player?.id, player?.volume])

  if (!player) return null
  const send = (command: PlayerCommand) => run({ player, command })
  const shown = volume ?? player.volume ?? 0
  const commitVolume = () => { if (volume !== null) send({ volume }) }

  return (
    <section className="playerbar" aria-label="Media playback">
      <label className="pb-pick">
        <span className="lbl">Device</span>
        <select value={player.id} onChange={(e) => { setChosen(e.target.value); save(e.target.value) }}>
          {players.map((p) => <option key={p.id} value={p.id}>{p.state === 'playing' ? '▶ ' : ''}{p.name}</option>)}
        </select>
      </label>
      <div className="pb-now">
        {player.art ? <img className="pb-art" src={player.art} alt="" /> : <div className="pb-art" aria-hidden="true" />}
        <div className="pb-meta">
          <b>{player.title ?? stateLabel[player.state]}</b>
          <span>{player.title ? [player.subtitle, stateLabel[player.state]].filter(Boolean).join(' · ') : player.name}</span>
          {player.progress !== undefined && <div className="pb-track"><div style={{ width: `${Math.round(player.progress * 100)}%` }} /></div>}
        </div>
      </div>
      <div className="pb-controls">
        <Btn label="Previous" icon="previous" disabled={!player.can.previous} onClick={() => send('previous')} />
        <Btn main label={player.state === 'playing' ? 'Pause' : 'Play'} icon={player.state === 'playing' ? 'pause' : 'play'} disabled={!player.can.pause} onClick={() => send('play_pause')} />
        <Btn label="Next" icon="next" disabled={!player.can.next} onClick={() => send('next')} />
      </div>
      <div className="pb-volume">
        <Btn label={player.muted ? 'Unmute' : 'Mute'} icon={player.muted ? 'muted' : 'volume'} disabled={!player.can.mute} onClick={() => send('mute')} />
        <input type="range" min={0} max={1} step={0.01} aria-label="Volume" disabled={!player.can.volume || player.volume === undefined}
          value={shown}
          onChange={(e) => setVolume(Number(e.target.value))}
          onPointerUp={commitVolume} onKeyUp={commitVolume} onBlur={commitVolume} />
        <span className="num pb-vol">{player.volume === undefined ? '—' : Math.round(shown * 100)}</span>
      </div>
      <Btn label={player.state === 'off' ? 'Turn on' : 'Turn off'} icon="power" disabled={!player.can.power} onClick={() => send('power')} />
    </section>
  )
}
