import { describe, expect, it } from 'vitest'
import type { Player, RoonZone } from '../data/types'
import { choices, mainArtist, nowPlayingFrom, photoFrom, slidesFor } from './nowPlaying'

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

  it('holds on the picked zone, playing or paused', () => {
    const lounge = zone('Lounge', 'playing', 'Miles Davis')
    const office = zone('Office', 'paused', 'Nobody Known')
    const all = [lounge, zone('Bath', 'playing'), office]
    expect(slidesFor(all, photos, 'Lounge')).toEqual([{ zone: lounge, image: 'cover' }, { zone: lounge, image: 'artist' }])
    expect(slidesFor(all, photos, 'Office')).toEqual([{ zone: office, image: 'cover' }])
  })

  it('takes turns again when the picked zone has stopped', () => {
    const lounge = zone('Lounge', 'playing')
    expect(slidesFor([lounge, zone('Bath', 'idle')], photos, 'Bath')).toEqual([{ zone: lounge, image: 'cover' }])
  })

  it('has nothing to show when every zone is idle', () => {
    expect(slidesFor([zone('A', 'idle')], photos)).toEqual([])
  })
})

describe('nowPlayingFrom', () => {
  const can = { pause: true, next: false, previous: false, volume: false, mute: false, power: false }
  const player = (id: string, name: string, state: Player['state'], title?: string): Player => ({ id, name, state, title, subtitle: 'S1E4', art: '/a.jpg', can })

  it('adds other players with something on, after the Roon zones and without repeating them', () => {
    const lounge = { ...zone('Lounge', 'playing'), id: 'media_player.lounge' }
    expect(nowPlayingFrom([lounge], [
      player('media_player.lounge', 'Lounge', 'playing', 'So What'),
      player('media_player.den', 'Apple TV den', 'paused', 'Shōgun'),
      player('media_player.lg', 'LG OLED', 'idle', 'Home'),
      player('media_player.pod', 'HomePod', 'playing'),
    ])).toEqual([lounge, { id: 'media_player.den', name: 'Apple TV den', state: 'paused', track: 'Shōgun', artist: 'S1E4', art: '/a.jpg', progress: undefined }])
  })

  it('lists the choices playing first, then paused, leaving idle out', () => {
    const a = zone('A', 'paused'), b = zone('B', 'idle'), c = zone('C', 'playing')
    expect(choices([a, b, c])).toEqual([c, a])
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
