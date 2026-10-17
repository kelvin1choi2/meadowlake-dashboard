import { describe, expect, it } from 'vitest'
import type { Scene } from '../data/types'
import { countRuns, roomScenes, withUses } from './sceneUse'

const scene = (id: string, room = 'Lounge'): Scene => ({ id, name: id, room })

describe('countRuns', () => {
  it('counts one run per recorded state, ignoring unknown and unavailable', () => {
    expect(countRuns({
      'scene.a': [{ s: '2026-10-17T08:00:00+00:00' }, { s: '2026-10-17T20:00:00+00:00' }],
      'scene.b': [{ s: 'unavailable' }, { s: '2026-10-16T21:00:00+00:00' }],
      'scene.c': [{ s: 'unknown' }],
    })).toEqual({ 'scene.a': 2, 'scene.b': 1 })
  })
})

describe('roomScenes', () => {
  const all = withUses([scene('Read'), scene('Vinyl'), scene('Bright'), scene('Relax'), scene('Movie', 'Theater')], { Vinyl: 7, Relax: 2 })

  it("leads with the room's most used scenes, then the rest by name", () => {
    expect(roomScenes(all, 'Lounge').map((s) => s.id)).toEqual(['Vinyl', 'Relax', 'Bright', 'Read'])
  })

  it('shows only as many as fit', () => {
    expect(roomScenes(all, 'Lounge', 2).map((s) => s.id)).toEqual(['Vinyl', 'Relax'])
  })

  it('sorts by name when nothing has run', () => {
    expect(roomScenes([scene('Read'), scene('Bright')], 'Lounge').map((s) => s.id)).toEqual(['Bright', 'Read'])
  })
})
