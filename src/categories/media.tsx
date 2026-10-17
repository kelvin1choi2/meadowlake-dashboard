import { useEffect, useState } from 'react'
import { roonDisplayUrl, roonRockUrl } from '../config/home'
import type { HouseState, RoonZone } from '../data/types'
import type { RunAction } from '../data/useHouse'
import { findArtistPhoto, mainArtist, slideMs, slidesFor } from '../media/nowPlaying'
import { duration } from '../rock/rock'
import { Bar, Card, Chip, Dot, KV, Ring, Toggle } from '../widgets'
import { ConfirmButton } from '../widgets/ConfirmButton'
import { PlayerBar } from '../widgets/PlayerBar'
import type { Category } from './types'

/** Artist photos already looked up, by name: a URL, or null when Wikipedia has none. */
const artistPhotos = new Map<string, string | null>()

function useArtistPhotos(zones: RoonZone[]) {
  const [, setFound] = useState(0)
  const wanted = [...new Set(zones.filter((z) => z.state !== 'idle').flatMap((z) => mainArtist(z.artist) ?? []))]
    .filter((a) => !artistPhotos.has(a))
  const key = wanted.join('\n')
  useEffect(() => {
    if (!key) return
    const stop = new AbortController()
    for (const artist of key.split('\n')) {
      findArtistPhoto(artist, stop.signal)
        .then((url) => { artistPhotos.set(artist, url ?? null); setFound((n) => n + 1) })
        .catch(() => { if (!stop.signal.aborted) artistPhotos.set(artist, null) })
    }
    return () => stop.abort()
  }, [key])
  return (artist: string) => Boolean(artistPhotos.get(artist))
}

/** Counts up once a minute, to step through the slides. */
function useTick(ms: number) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ms)
    return () => clearInterval(id)
  }, [ms])
  return tick
}

/**
 * What Roon is playing, drawn from Home Assistant. Roon's own web display only starts when
 * music starts on a zone, so opened mid-song it sat blank until someone tapped Display Now.
 * Every minute it moves on: from the album cover to a photo of the artist, then to the next
 * playing zone.
 */
function NowPlayingCard({ zones }: { zones: RoonZone[] }) {
  const hasPhoto = useArtistPhotos(zones)
  const tick = useTick(slideMs)
  const slides = slidesFor(zones, hasPhoto)
  const slide = slides.length ? slides[tick % slides.length] : undefined
  const zone = slide?.zone
  const artist = mainArtist(zone?.artist)
  const picture = slide?.image === 'artist' && artist ? artistPhotos.get(artist) ?? undefined : zone?.art
  const others = zones.filter((z) => z !== zone && z.state === 'playing')
  return (
    <Card
      wide
      color="var(--media)"
      title="Now playing"
      chip={<a className="chip neutral link" href={roonDisplayUrl(window.location.href)} target="_blank" rel="noreferrer">Roon display</a>}
    >
      {zone ? (
        <div className="nowp">
          {picture
            ? <img key={picture} className="nowp-art" src={picture} alt={slide?.image === 'artist' ? artist : ''} />
            : <div className="nowp-art" aria-hidden="true" />}
          <div className="nowp-meta">
            <span className="lbl">{zone.name} · {zone.state === 'playing' ? 'Playing' : 'Paused'}</span>
            <b>{zone.track ?? 'Unknown track'}</b>
            {zone.artist && <span className="nowp-artist">{zone.artist}</span>}
            {zone.album && <span className="nowp-album">{zone.album}</span>}
            {zone.progress !== undefined && <Bar value={zone.progress} color="var(--media)" />}
            {others.length > 0 && (
              <span className="nowp-also">Also playing: {others.map((z) => `${z.name} (${z.track ?? 'unknown'})`).join(' · ')}</span>
            )}
            {slides.length > 1 && (
              <span className="nowp-dots" aria-hidden="true">
                {slides.map((s, i) => <i key={i} className={s === slide ? 'on' : ''} />)}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="nowp nowp-quiet">
          <div className="nowp-art" aria-hidden="true" />
          <div className="nowp-meta">
            <b>Nothing playing in Roon</b>
            <span className="nowp-album">Start music in Roon and it shows here.</span>
          </div>
        </div>
      )}
    </Card>
  )
}

type RockProps = { rock: HouseState['media']['rock']; run: RunAction }

function rockChip(rock: RockProps['rock']) {
  if (rock.status === 'checking') return <Chip tone="neutral">Checking</Chip>
  if (rock.status !== 'up') return <Chip tone="bad">Not answering</Chip>
  if (rock.roon === 'running') return <Chip tone="good">Roon Server running</Chip>
  if (rock.roon === 'missing-codecs') return <Chip tone="warn">Missing codecs</Chip>
  return <Chip tone="bad">Roon Server stopped</Chip>
}

/** "2.73 (build 1700)" → ["2.73", "(build 1700)"] */
const splitVersion = (v: string) => [v.split(' ')[0], v.slice(v.indexOf(' ') + 1 || v.length)]

/** The Roon ROCK server at a glance, with the restart and power buttons from its own page. */
function RockCard({ rock, run }: RockProps) {
  const up = rock.status === 'up' ? rock : null
  const [roonV, roonBuild] = splitVersion(up?.roonVersion ?? '')
  return (
    <Card wide color="var(--media)" title="Roon ROCK" chip={rockChip(rock)}>
      {up ? (
        <div className="rock-stats">
          <div className="stat">
            <div className="lbl">Roon Server</div>
            <div className="v">{roonV}</div>
            <span className="sub">{roonBuild}</span>
          </div>
          <div className="stat">
            <div className="lbl">Running for</div>
            <div className="v">{up.roon === 'stopped' ? 'Stopped' : duration(up.roonUptime)}</div>
            <span className="sub">ROCK up {duration(up.uptime)}</span>
          </div>
          {up.disk && (
            <div className="stat rock-ring">
              <Ring value={up.disk.used / up.disk.total} color="var(--media)" />
              <div>
                <div className="lbl">Data disk</div>
                <span className="sub">{up.disk.used} of {up.disk.total} GB</span>
                {up.music && (
                  <span className="sub">
                    Music drive {up.music === 'not mounted' ? 'not mounted' : `${up.music.used} of ${up.music.total} GB`}
                  </span>
                )}
              </div>
            </div>
          )}
          <div className="stat">
            <div className="lbl">Address</div>
            <div className="v rock-ip">{up.ip ?? '—'}</div>
            <span className="sub">
              {up.dhcp === undefined ? '' : up.dhcp ? 'DHCP · ' : 'Static · '}Roon OS {up.os}
            </span>
            {up.cd && <span className="sub">CD: {up.cd.label}</span>}
          </div>
        </div>
      ) : (
        <p className="rock-note">
          {rock.status === 'checking'
            ? 'Checking the ROCK…'
            : "The ROCK isn't answering. It may be restarting or powered off, or this dashboard isn't on the home network."}
        </p>
      )}
      <div className="rock-actions">
        <ConfirmButton disabled={!up} confirm="Tap again to restart" onConfirm={() => run({ rock: 'restartRoon' })}>
          {up?.roon === 'stopped' ? 'Start Roon Server' : 'Restart Roon Server'}
        </ConfirmButton>
        {up?.roon !== 'stopped' && (
          <ConfirmButton disabled={!up} confirm="Tap again to stop" onConfirm={() => run({ rock: 'stopRoon' })}>
            Stop Roon Server
          </ConfirmButton>
        )}
        {up?.cd?.canEject && (
          <ConfirmButton confirm="Tap again to eject" onConfirm={() => run({ rock: 'eject' })}>
            Eject CD
          </ConfirmButton>
        )}
        <ConfirmButton disabled={!up} confirm="Tap again to reboot" onConfirm={() => run({ rock: 'reboot' })}>
          Reboot ROCK
        </ConfirmButton>
        <ConfirmButton danger disabled={!up} confirm="Tap again: needs the power button to come back" onConfirm={() => run({ rock: 'powerOff' })}>
          Power off
        </ConfirmButton>
      </div>
      <a className="rock-more" href={roonRockUrl} target="_blank" rel="noreferrer">
        Updates, network settings and reset are on the ROCK's own page
      </a>
    </Card>
  )
}

export const media: Category = {
  id: 'media',
  name: 'Media',
  apps: ['roon', 'rock', 'plex'],
  wide: true,
  status: (h) => {
    const n = h.media.roon.filter((z) => z.state === 'playing').length
    return { tone: 'neutral', label: n ? `${n} zone${n > 1 ? 's' : ''} playing` : 'Quiet' }
  },
  Tile: ({ house }) => {
    const playing = house.media.roon.find((z) => z.state === 'playing')
    const stream = house.media.plex.streams[0]
    const tvs = house.media.screens.filter((s) => s.tv)
    return (
      <>
        {playing ? (
          <>
            <div className="np">
              {playing.art ? <img className="art" src={playing.art} alt="" /> : <div className="art" aria-hidden="true" />}
              <div className="meta">
                <span className="lbl">Roon · {playing.name}</span>
                <b>{playing.track}</b>
                <span>{playing.artist} · {playing.album}</span>
              </div>
            </div>
            <Bar value={playing.progress ?? 0} color="var(--media)" />
          </>
        ) : (
          <div className="lbl">Nothing playing in Roon</div>
        )}
        <div className="list">
          <div><Dot color="var(--media)" />Plex<span className="r">{stream ? `${house.media.plex.streams.length} stream · ${stream.client}` : 'No streams'}</span></div>
          <div><Dot />{tvs.map((t) => t.name.split(' (')[0]).join(' · ')}<span className="r">{tvs.map((t) => (t.on ? 'On' : 'Off')).join(' · ')}</span></div>
        </div>
      </>
    )
  },
  Sheet: ({ house, update, run }) => (
    <>
      <NowPlayingCard zones={house.media.roon} />
      <PlayerBar players={house.media.players} run={run} />
      <Card wide color="var(--media)" title="Roon zones">
        <div className="tw">
          <table>
            <thead><tr><th>Zone</th><th>State</th><th>Playing</th><th>Volume</th></tr></thead>
            <tbody>
              {house.media.roon.map((z) => (
                <tr key={z.name}>
                  <td>{z.name}</td>
                  <td>{z.state[0].toUpperCase() + z.state.slice(1)}</td>
                  <td>{z.track ? `${z.track} · ${z.artist}` : '—'}</td>
                  <td className="num">{z.volume ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card color="var(--media)" title="Plex" chip={<Chip tone={house.media.plex.up ? 'good' : 'bad'}>{house.media.plex.up ? 'Server up' : 'Server down'}</Chip>}>
        <KV
          rows={[
            ...house.media.plex.streams.flatMap((s): [string, string][] => [
              ['Now streaming', s.client],
              ['Title', s.title],
              ...(s.transcoding === undefined ? [] : [['Transcoding', s.transcoding ? 'Yes' : 'No'] as [string, string]]),
            ]),
            ...(house.media.plex.streams.length ? [] : [['Now streaming', 'Nothing'] as [string, string]]),
            ...(house.media.plex.addedThisWeek === undefined ? [] : [['Added this week', `${house.media.plex.addedThisWeek} titles`] as [string, string]]),
          ]}
        />
      </Card>
      <Card color="var(--media)" title="Screens">
        {house.media.screens.map((s, i) => (
          <Toggle key={s.id} label={s.name} on={s.on} onChange={(on) => update((h) => { h.media.screens[i].on = on })} />
        ))}
      </Card>
      <RockCard rock={house.media.rock} run={run} />
    </>
  ),
}
