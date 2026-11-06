import { describe, expect, it } from 'vitest'
import { sampleHouse } from '../data/sample'
import { splitColors } from './PartyCard'

const party = sampleHouse.party!

describe('splitColors', () => {
  it('shows one color while strobing', () => {
    expect(splitColors({ ...party, strobe: true, colorIndex: 2 })).toEqual([2])
  })

  it('shows this color and the next when steady and split, wrapping round', () => {
    expect(splitColors({ ...party, strobe: false, colorIndex: 2 })).toEqual([2, 3])
    expect(splitColors({ ...party, strobe: false, colorIndex: 4 })).toEqual([4, 0])
  })

  it('shows one color without split support or with a one-color album', () => {
    expect(splitColors({ ...party, strobe: false, split: false })).toEqual([party.colorIndex])
    expect(splitColors({ ...party, strobe: false, palette: ['#ffffff'], colorIndex: 0 })).toEqual([0])
    expect(splitColors({ ...party, palette: [] })).toEqual([])
  })
})
