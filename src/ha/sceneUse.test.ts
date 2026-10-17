import { describe, expect, it } from 'vitest'
import type { Scene } from '../data/types'
import { countRuns, rankByUse } from './sceneUse'

const scene = (id: string, favorite?: number): Scene => ({ id, name: id, room: 'Lounge', ...(favorite === undefined ? {} : { favorite }) })
const tile = (scenes: Scene[]) => scenes.filter((s) => s.favorite !== undefined).sort((a, b) => a.favorite! - b.favorite!).map((s) => s.id)

describe('countRuns', () => {
  it('counts one run per recorded state, ignoring unknown and unavailable', () => {
    expect(countRuns({
      'scene.a': [{ s: '2026-10-17T08:00:00+00:00' }, { s: '2026-10-17T20:00:00+00:00' }],
      'scene.b': [{ s: 'unavailable' }, { s: '2026-10-16T21:00:00+00:00' }],
      'scene.c': [{ s: 'unknown' }],
    })).toEqual({ 'scene.a': 2, 'scene.b': 1 })
  })
})

describe('rankByUse', () => {
  const all = [scene('a', 0), scene('b', 1), scene('c', 2), scene('d'), scene('e'), scene('f')]

  it('leads with the most used scenes and fills the rest from the hand-picked ones', () => {
    expect(tile(rankByUse(all, { e: 9, f: 3 }, 4))).toEqual(['e', 'f', 'a', 'b'])
  })

  it('breaks ties by the hand-picked order', () => {
    expect(tile(rankByUse(all, { c: 2, b: 2, d: 2 }, 3))).toEqual(['b', 'c', 'd'])
  })

  it('keeps the hand-picked order when nothing has run', () => {
    expect(tile(rankByUse(all, {}, 5))).toEqual(['a', 'b', 'c'])
  })

  it('drops scenes that fall off the tile', () => {
    const ranked = rankByUse(all, { d: 1, e: 1, f: 1 }, 3)
    expect(tile(ranked)).toEqual(['d', 'e', 'f'])
    expect(ranked.find((s) => s.id === 'a')).not.toHaveProperty('favorite')
  })
})
