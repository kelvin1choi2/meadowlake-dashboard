import { roonDisplayUrl, roonRockUrl } from '../config/home'
import type { HouseState } from '../data/types'
import type { RunAction } from '../data/useHouse'
import { duration } from '../rock/rock'
import { Bar, Card, Chip, Dot, KV, Toggle } from '../widgets'
import { ConfirmButton } from '../widgets/ConfirmButton'
import { canEmbed } from '../widgets/embed'
import { PlayerBar } from '../widgets/PlayerBar'
import type { Category } from './types'

/** A page from the home network in a card, with a link to open it on its own. */
function EmbedCard({ title, url, frameTitle }: { title: string; url: string; frameTitle: string }) {
  return (
    <Card
      wide
      color="var(--media)"
      title={title}
      chip={<a className="chip neutral link" href={url} target="_blank" rel="noreferrer">Open full screen</a>}
    >
      {canEmbed(url, window.location.href) ? (
        <iframe className="embed" src={url} title={frameTitle} />
      ) : (
        <div className="embed embed-off">
          <p>This appears here when the dashboard runs on your home network.</p>
        </div>
      )}
    </Card>
  )
}

/** The Roon ROCK server: its status, disks and network, with the restart and power buttons from its own page. */
function RockCard({ rock, run }: { rock: HouseState['media']['rock']; run: RunAction }) {
  const up = rock.status === 'up' ? rock : null
  const chip =
    rock.status === 'checking' ? <Chip tone="neutral">Checking</Chip>
    : !up ? <Chip tone="bad">Not answering</Chip>
    : up.roon === 'running' ? <Chip tone="good">Roon Server running</Chip>
    : up.roon === 'missing-codecs' ? <Chip tone="warn">Missing codecs</Chip>
    : <Chip tone="bad">Roon Server stopped</Chip>
  const busy = !up
  return (
    <Card wide color="var(--media)" title="Roon ROCK" chip={chip}>
      <div className="rock">
        {up ? (
          <KV
            rows={[
              ['Roon Server', up.roonVersion],
              ['Running for', up.roon === 'stopped' ? 'Stopped' : duration(up.roonUptime)],
              ['Roon OS', up.os],
              ['ROCK up for', duration(up.uptime)],
              ...(up.ip ? [['Address', `${up.ip}${up.dhcp === undefined ? '' : up.dhcp ? ' · DHCP' : ' · static'}`] as [string, string]] : []),
              ...(up.gateway ? [['Gateway · DNS', `${up.gateway} · ${up.dns ?? '—'}`] as [string, string]] : []),
              ...(up.cd ? [['CD drive', up.cd.label] as [string, string]] : []),
            ]}
          />
        ) : (
          <p className="rock-note">
            {rock.status === 'checking'
              ? 'Checking the ROCK…'
              : "The ROCK isn't answering. It may be restarting or powered off, or this dashboard isn't on the home network."}
          </p>
        )}
        <div className="rock-side">
          {up?.disk && (
            <div className="rock-disk">
              <div className="lbl">Data disk · {up.disk.used} of {up.disk.total} GB</div>
              <Bar value={up.disk.used / up.disk.total} color="var(--media)" />
            </div>
          )}
          {up?.music && (
            <div className="rock-disk">
              {up.music === 'not mounted' ? (
                <div className="lbl">Music drive · not mounted</div>
              ) : (
                <>
                  <div className="lbl">Music drive · {up.music.used} of {up.music.total} GB</div>
                  <Bar value={up.music.used / up.music.total} color="var(--media)" />
                </>
              )}
            </div>
          )}
          <div className="rock-actions">
            <ConfirmButton disabled={busy} confirm="Tap again to restart" onConfirm={() => run({ rock: 'restartRoon' })}>
              {up?.roon === 'stopped' ? 'Start Roon Server' : 'Restart Roon Server'}
            </ConfirmButton>
            {up?.roon !== 'stopped' && (
              <ConfirmButton disabled={busy} confirm="Tap again to stop" onConfirm={() => run({ rock: 'stopRoon' })}>
                Stop Roon Server
              </ConfirmButton>
            )}
            {up?.cd?.canEject && (
              <ConfirmButton confirm="Tap again to eject" onConfirm={() => run({ rock: 'eject' })}>
                Eject CD
              </ConfirmButton>
            )}
            <ConfirmButton disabled={busy} confirm="Tap again to reboot" onConfirm={() => run({ rock: 'reboot' })}>
              Reboot ROCK
            </ConfirmButton>
            <ConfirmButton danger disabled={busy} confirm="Tap again: needs the power button to come back" onConfirm={() => run({ rock: 'powerOff' })}>
              Power off
            </ConfirmButton>
          </div>
          <a className="rock-more" href={roonRockUrl} target="_blank" rel="noreferrer">
            Updates, network settings and reset are on the ROCK's own page
          </a>
        </div>
      </div>
    </Card>
  )
}

export const media: Category = {
  id: 'media',
  name: 'Media',
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
              <div className="art" aria-hidden="true" />
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
      <EmbedCard title="Roon display" url={roonDisplayUrl} frameTitle="Roon now playing display" />
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
