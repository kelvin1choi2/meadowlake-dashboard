import { describe, expect, it } from 'vitest'
import type { RoonZone } from '../data/types'
import { mainArtist, photoFrom, slidesFor } from './nowPlaying'

const zone = (name: string, state: RoonZone['state'], artist?: string): RoonZone => ({ name, state, artist, track: 'T' })

describe('slidesFor', () => {
  const photos = (artist: string) => artist === 'Miles Davis'

  it('gives each playing zone its cover, then the artist photo when there is one', () => {
    const lounge = zone('Lounge', 'playing', 'Miles Davis')
    const bath = zone('Bath', 'playing', 'Nobody Known')
    expect(slidesFor([lounge, zone('Theater', 'idle'), bath], photos)).toEqual([
      { zone: lounge, image: 'cover' },
      { zone: lounge, image: 'artist' },
      { zone: bath, image: 'cover' },
    ])
  })

  it('shows one paused zone when nothing is playing', () => {
    const a = zone('A', 'paused', 'Miles Davis')
    expect(slidesFor([a, zone('B', 'paused')], photos)).toEqual([{ zone: a, image: 'cover' }, { zone: a, image: 'artist' }])
  })

  it('has nothing to show when every zone is idle', () => {
    expect(slidesFor([zone('A', 'idle')], photos)).toEqual([])
  })
})

describe('mainArtist', () => {
  it('takes the first of several artists', () => {
    expect(mainArtist('Miles Davis / John Coltrane')).toBe('Miles Davis')
    expect(mainArtist('Daft Punk')).toBe('Daft Punk')
    expect(mainArtist(undefined)).toBeUndefined()
    expect(mainArtist('  ')).toBeUndefined()
  })
})

describe('photoFrom', () => {
  const answer = (page: object) => ({ query: { pages: { '1': page } } })

  it("returns a musician's photo", () => {
    expect(photoFrom(answer({ description: 'American jazz trumpeter (1926–1991)', thumbnail: { source: 'https://upload.wikimedia.org/m.jpg' } })))
      .toBe('https://upload.wikimedia.org/m.jpg')
  })

  it('skips pages that are not about music', () => {
    expect(photoFrom(answer({ description: 'Species of bird', thumbnail: { source: 'x' } }))).toBeUndefined()
  })

  it('skips missing and disambiguation pages, and odd answers', () => {
    expect(photoFrom(answer({ missing: '' }))).toBeUndefined()
    expect(photoFrom(answer({ description: 'band', pageprops: { disambiguation: '' }, thumbnail: { source: 'x' } }))).toBeUndefined()
    expect(photoFrom(null)).toBeUndefined()
    expect(photoFrom({})).toBeUndefined()
  })
})
