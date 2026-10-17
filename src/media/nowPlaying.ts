import type { RoonZone } from '../data/types'

// What the Now Playing card shows, turn by turn: each playing zone in order, and within a
// zone its album cover and then (when Wikipedia has one) a photo of the artist.

export type Slide = { zone: RoonZone; image: 'cover' | 'artist' }

/** How long each picture stays up. */
export const slideMs = 60_000

/**
 * The slides to cycle through. Every playing zone takes a turn; with nothing playing, a
 * paused zone stands still on its cover. `hasPhoto` says whether an artist photo was found.
 */
export function slidesFor(zones: RoonZone[], hasPhoto: (artist: string) => boolean): Slide[] {
  const playing = zones.filter((z) => z.state === 'playing')
  const shown = playing.length ? playing : zones.filter((z) => z.state === 'paused').slice(0, 1)
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
