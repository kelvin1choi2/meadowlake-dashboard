import { describe, expect, it } from 'vitest'
import { paletteFrom, toHex, vivid } from './palette'

/** An image as RGBA pixels: `n` pixels of each colour. */
function image(...parts: [number, number, number, number][]): number[] {
  return parts.flatMap(([r, g, b, n]) => Array.from({ length: n }, () => [r, g, b, 255]).flat())
}

describe('paletteFrom', () => {
  it('puts the most prominent colour first and makes colours vivid', () => {
    const p = paletteFrom(image([20, 40, 90, 300], [200, 90, 60, 100]))
    expect(p).toHaveLength(2)
    expect(p[0]).toBe(toHex(vivid([20, 40, 90])))
    expect(p[1]).toBe(toHex(vivid([200, 90, 60])))
  })

  it('skips colours too close to one already picked', () => {
    expect(paletteFrom(image([200, 30, 30, 100], [210, 35, 35, 100]))).toHaveLength(1)
  })

  it('stops at five colours', () => {
    const hues: [number, number, number, number][] = [
      [255, 0, 0, 10], [0, 255, 0, 10], [0, 0, 255, 10], [255, 255, 0, 10], [0, 255, 255, 10], [255, 0, 255, 10],
    ]
    expect(paletteFrom(image(...hues))).toHaveLength(5)
  })

  it('lets a small colourful patch beat a large grey area', () => {
    expect(paletteFrom(image([120, 120, 120, 300], [30, 160, 170, 100]))[0]).toBe(toHex(vivid([30, 160, 170])))
  })

  it('turns a black-and-white cover into white', () => {
    expect(paletteFrom(image([0, 0, 0, 500], [230, 230, 230, 200]))).toEqual(['#ffffff'])
  })

  it('ignores transparent pixels and gives nothing for an empty image', () => {
    expect(paletteFrom([255, 0, 0, 0])).toEqual([])
    expect(paletteFrom([])).toEqual([])
  })
})
