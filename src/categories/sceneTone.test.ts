import { describe, expect, it } from 'vitest'
import { distinctTones, sceneTone, tones } from './sceneTone'

describe('sceneTone', () => {
  it('reads the color from the name, specific words first', () => {
    expect(sceneTone('Bright Lounge')).toBe('sun')
    expect(sceneTone('Bright Video')).toBe('indigo')
    expect(sceneTone('Vinyl')).toBe('amber')
    expect(sceneTone('Undercounter only')).toBe('peach')
    expect(sceneTone('Kind Of Blue')).toBe('blue')
    expect(sceneTone('Nightlight')).toBe('dusk')
  })

  it('gives unrecognized names a steady tone', () => {
    expect(sceneTone('Beastie Boys')).toBe(sceneTone('beastie boys'))
    expect(tones).toContain(sceneTone('Beastie Boys'))
  })

  it('keeps a row of favorites distinct', () => {
    expect(distinctTones(['Bright Lounge', 'Vinyl', 'Bright Video', 'Undercounter only', 'bright kitchen']))
      .toEqual(['sun', 'amber', 'indigo', 'peach', 'mint'])
  })
})
