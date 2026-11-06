import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { HouseState } from '../data/types'
import type { UpdateHouse } from '../data/useHouse'
import { paletteFrom } from './palette'

// Picks the party lights' colors from the cover of the album playing in their Roon zone and
// saves them in Home Assistant, which cycles the bars through them (docs/party-lights.md).
// Reading a cover's pixels needs Home Assistant to let this dashboard's address do so (its
// `cors_allowed_origins` setting); without it the cover still shows, but the colors can't be read.

/** Why the cover couldn't be read, so the card can say how to fix it. */
export type PaletteProblem = 'not-allowed' | 'unreachable' | `status ${number}` | 'unreadable'
export type PaletteStatus = { state: 'waiting' | 'ok' } | { state: 'blocked'; problem: PaletteProblem }

let status: PaletteStatus = { state: 'waiting' }
const listeners = new Set<() => void>()
function setStatus(s: PaletteStatus) {
  if (JSON.stringify(s) === JSON.stringify(status)) return
  status = s
  listeners.forEach((l) => l())
}

export function usePaletteStatus(): PaletteStatus {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => status)
}

class CoverProblem extends Error {
  constructor(readonly problem: PaletteProblem) { super(problem) }
}

/**
 * The cover's main colors, read from a small copy of it. Fetched rather than loaded as an
 * image, never from the browser's cache, so a failure says why: Home Assistant not allowing
 * this address, not answering, or answering with an error.
 */
async function readCover(url: string): Promise<string[]> {
  let res: Response
  try {
    res = await fetch(url, { mode: 'cors', cache: 'no-store' })
  } catch {
    // Reachable without permission to read means cors_allowed_origins doesn't cover this address.
    const reachable = await fetch(url, { mode: 'no-cors', cache: 'no-store' }).then(() => true, () => false)
    throw new CoverProblem(reachable ? 'not-allowed' : 'unreachable')
  }
  if (!res.ok) throw new CoverProblem(`status ${res.status}`)
  try {
    const bitmap = await createImageBitmap(await res.blob())
    const size = 48
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    ctx.drawImage(bitmap, 0, 0, size, size)
    return paletteFrom(ctx.getImageData(0, 0, size, size).data)
  } catch {
    throw new CoverProblem('unreadable')
  }
}

/** The cover the party lights follow, when that zone has one. */
export function followedArt(house: HouseState): string | undefined {
  const party = house.party
  return party ? house.media.roon.find((z) => z.id === party.follow)?.art : undefined
}

/** How often to try again while the cover can't be read (Home Assistant restarting, say). */
const retryMs = 60_000

/**
 * Watches the followed zone's cover and, when it changes, saves its colors to the party lights.
 * Runs wherever the dashboard is open and connected; each open dashboard comes to the same colors.
 * The cover is fetched fresh each time, never from the browser's cache: the copy the Now Playing
 * card loaded was fetched without asking Home Assistant's permission to read its pixels.
 */
export function useAlbumPalette(house: HouseState, update: UpdateHouse, live: boolean) {
  const cover = live && house.party?.setUp ? house.party.cover : undefined
  const latest = useRef(cover?.url)
  latest.current = cover?.url
  const key = cover?.key
  useEffect(() => {
    if (!key) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const attempt = () => {
      const url = latest.current
      if (!url) return
      readCover(url).then(
        (palette) => {
          if (cancelled) return
          setStatus({ state: 'ok' })
          if (palette.length) update((h) => { if (h.party && h.party.palette.join(',') !== palette.join(',')) h.party.palette = palette })
        },
        (e: unknown) => {
          if (cancelled) return
          setStatus({ state: 'blocked', problem: e instanceof CoverProblem ? e.problem : 'unreadable' })
          timer = setTimeout(attempt, retryMs)
        },
      )
    }
    attempt()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [key, update])
}
