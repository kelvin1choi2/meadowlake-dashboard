import { roonDisplayUrl, roonRockUrl } from '../config/home'
import { Bar, Card, Chip, Dot, KV, Toggle } from '../widgets'
import { canEmbed } from '../widgets/embed'
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
  Sheet: ({ house, update }) => (
    <>
      <EmbedCard title="Roon display" url={roonDisplayUrl} frameTitle="Roon now playing display" />
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
      <EmbedCard title="Roon ROCK" url={roonRockUrl} frameTitle="Roon ROCK server page" />
    </>
  ),
}
