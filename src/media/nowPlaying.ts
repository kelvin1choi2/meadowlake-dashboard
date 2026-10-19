import { useSyncExternalStore } from 'react'
import type { Player, RoonZone } from '../data/types'

// What the Now Playing card shows, turn by turn: each playing zone in order, and within a
// zone its album cover and then (when Wikipedia has one) a photo of the artist. Tapping a
// zone's name holds the card (and the Media tile) on that zone.

export type Slide = { zone: RoonZone; image: 'cover' | 'artist' }

/** How long each picture stays up. */
export const slideMs = 60_000

/**
 * Everything with something on: Roon zones first, then other players (Apple TVs, HomePods,
 * TVs) that report a title and aren't one of the Roon zones, in the same shape.
 */
export function nowPlayingFrom(roon: RoonZone[], players: Player[]): RoonZone[] {
  const taken = new Set(roon.flatMap((z) => (z.id ? [z.name, z.id] : [z.name])))
  const others = players
    .filter((p) => (p.state === 'playing' || p.state === 'paused') && p.title && !taken.has(p.id) && !taken.has(p.name))
    .map((p): RoonZone => ({ id: p.id, name: p.name, state: p.state as 'playing' | 'paused', track: p.title, artist: p.subtitle, art: p.art, progress: p.progress }))
  return [...roon, ...others]
}

/** The zones someone can hold the card on: those playing, then those paused. */
export function choices(zones: RoonZone[]): RoonZone[] {
  return [...zones.filter((z) => z.state === 'playing'), ...zones.filter((z) => z.state === 'paused')]
}

/**
 * The slides to cycle through. Every playing zone takes a turn; with nothing playing, a
 * paused zone stands still on its cover. With a zone `picked` (by name) and still on, only
 * that zone shows. `hasPhoto` says whether an artist photo was found.
 */
export function slidesFor(zones: RoonZone[], hasPhoto: (artist: string) => boolean, picked?: string): Slide[] {
  const held = picked ? choices(zones).filter((z) => z.name === picked) : []
  const playing = zones.filter((z) => z.state === 'playing')
  const shown = held.length ? held : playing.length ? playing : zones.filter((z) => z.state === 'paused').slice(0, 1)
  return shown.flatMap((zone): Slide[] => {
    const artist = mainArtist(zone.artist)
    return artist && hasPhoto(artist) ? [{ zone, image: 'cover' }, { zone, image: 'artist' }] : [{ zone, image: 'cover' }]
  })
}

/** "Miles Davis / John Coltrane" → "Miles Davis": Roon joins several artists with slashes. */
export function mainArtist(artist: string | undefined): string | undefined {
  const first = artist?.split(' / ')[0].trim()
  return first || undefined
}

// Words that show a Wikipedia page is about a musician or band, not something sharing the name.
const musical = /\b(music|musician|singer|songwriter|rapper|band|group|duo|trio|quartet|quintet|orchestra|ensemble|composer|conductor|pianist|guitarist|bassist|drummer|saxophonist|trumpeter|violinist|cellist|vocalist|dj|producer|jazz|rock|pop|hip hop|soprano|tenor|baritone|choir)\b/i

type WikiPage = { missing?: string; description?: string; thumbnail?: { source: string }; pageprops?: { disambiguation?: string } }

/** The artist's photo from a Wikipedia API answer, or undefined when the page isn't a musician's. */
export function photoFrom(answer: unknown): string | undefined {
  const pages = (answer as { query?: { pages?: Record<string, WikiPage> } })?.query?.pages
  const page = pages && Object.values(pages)[0]
  if (!page || page.missing !== undefined || page.pageprops?.disambiguation !== undefined) return undefined
  if (!page.description || !musical.test(page.description)) return undefined
  return page.thumbnail?.source
}

/**
 * Looks up a photo of the artist on English Wikipedia. Only the artist's name leaves the
 * house; Home Assistant and the dashboard's settings are never involved.
 */
export async function findArtistPhoto(artist: string, signal?: AbortSignal): Promise<string | undefined> {
  const url = new URL('https://en.wikipedia.org/w/api.php')
  for (const [k, v] of Object.entries({
    action: 'query', format: 'json', formatversion: '1', origin: '*', redirects: '1',
    prop: 'pageimages|description|pageprops', piprop: 'thumbnail', pithumbsize: '800', ppprop: 'disambiguation',
    titles: artist,
  })) url.searchParams.set(k, v)
  const res = await fetch(url, { signal })
  return res.ok ? photoFrom(await res.json()) : undefined
}

// The zone held on screen, shared by the Now Playing card and the Media tile. Not saved:
// a fresh visit goes back to taking turns.
let picked: string | undefined
const listeners = new Set<() => void>()

/** Hold the card on a zone by name, or undefined to take turns again. */
export function pickZone(name: string | undefined) {
  picked = name
  listeners.forEach((l) => l())
}

export function usePickedZone(): string | undefined {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l) } },
    () => picked,
  )
}
