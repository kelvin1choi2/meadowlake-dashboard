// The party lights' colors, picked from an album cover (docs/party-lights.md). Pure, so it's
// unit tested; media/albumPalette.ts feeds it the cover's pixels.

export type Rgb = [number, number, number]

/** "#rrggbb" for a colour. */
export function toHex([r, g, b]: Rgb): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}

/** How colourful a colour is, 0–1 (HSV saturation). */
export function saturation([r, g, b]: Rgb): number {
  const max = Math.max(r, g, b)
  return max === 0 ? 0 : (max - Math.min(r, g, b)) / max
}

/**
 * The colour as the light bars should show it: as bright as it can be, keeping its hue.
 * LEDs can't show dark colours, so a navy on the cover becomes a clear blue on the bars.
 */
export function vivid(c: Rgb): Rgb {
  const max = Math.max(...c)
  if (max === 0) return [255, 255, 255]
  return c.map((v) => (v * 255) / max) as Rgb
}

function distance(a: Rgb, b: Rgb): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

/**
 * Up to `count` main colours of an image, from its RGBA pixels, most prominent first, made
 * vivid for the lights. Colourful areas count for more than greys, near-black hardly counts,
 * and colours too close to one already picked are skipped. A black-and-white cover gives white.
 */
export function paletteFrom(pixels: ArrayLike<number>, count = 5): string[] {
  const buckets = new Map<number, { sum: Rgb; n: number }>()
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bucket = buckets.get(key) ?? { sum: [0, 0, 0] as Rgb, n: 0 }
    bucket.sum[0] += r; bucket.sum[1] += g; bucket.sum[2] += b; bucket.n++
    buckets.set(key, bucket)
  }
  const scored = [...buckets.values()].map(({ sum, n }) => {
    const c: Rgb = [sum[0] / n, sum[1] / n, sum[2] / n]
    const value = Math.max(...c) / 255
    return { c, score: n * (0.15 + saturation(c)) * (value < 0.15 ? 0.05 : value) }
  }).sort((a, b) => b.score - a.score)

  const picked: Rgb[] = []
  for (const { c } of scored) {
    if (picked.length >= count) break
    const v = saturation(c) < 0.15 ? ([255, 255, 255] as Rgb) : vivid(c)
    if (picked.every((p) => distance(p, v) > 80)) picked.push(v)
  }
  return picked.map(toHex)
}
