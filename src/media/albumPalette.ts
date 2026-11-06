import { useEffect, useSyncExternalStore } from 'react'
import type { HouseState } from '../data/types'
import type { UpdateHouse } from '../data/useHouse'
import { paletteFrom } from './palette'

// Picks the party lights' colors from the cover of the album playing in their Roon zone and
// saves them in Home Assistant, which cycles the bars through them (docs/party-lights.md).
// Reading a cover's pixels needs Home Assistant to let this dashboard's address do so (its
// `cors_allowed_origins` setting); without it the cover still shows, but the colors can't be read.

/** 'blocked' when the cover couldn't be read, so the card can say how to fix it. */
export type PaletteStatus = 'waiting' | 'ok' | 'blocked'

let status: PaletteStatus = 'waiting'
const listeners = new Set<() => void>()
function setStatus(s: PaletteStatus) {
  if (s === status) return
  status = s
  listeners.forEach((l) => l())
}

export function usePaletteStatus(): PaletteStatus {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => status)
}

/** The cover's main colors, read from a small copy of it. */
function readCover(url: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const size = 48
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('no canvas'))
        ctx.drawImage(img, 0, 0, size, size)
        resolve(paletteFrom(ctx.getImageData(0, 0, size, size).data))
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = () => reject(new Error('cover not readable'))
    img.src = url
  })
}

/** The cover the party lights follow, when that zone has one. */
export function followedArt(house: HouseState): string | undefined {
  const party = house.party
  return party ? house.media.roon.find((z) => z.id === party.follow)?.art : undefined
}

/** Strips the short-lived token from a cover's address, so the same cover isn't read twice. */
function coverKey(url: string): string {
  return url.replace(/([?&])token=[^&]*&?/, '$1')
}

/**
 * Watches the followed zone's cover and, when it changes, saves its colors to the party lights.
 * Runs wherever the dashboard is open and connected; each open dashboard comes to the same colors.
 */
export function useAlbumPalette(house: HouseState, update: UpdateHouse, live: boolean) {
  const art = live && house.party?.setUp ? followedArt(house) : undefined
  const key = art ? coverKey(art) : undefined
  useEffect(() => {
    if (!art) return
    let cancelled = false
    readCover(art).then(
      (palette) => {
        if (cancelled) return
        setStatus('ok')
        if (palette.length) update((h) => { if (h.party && h.party.palette.join(',') !== palette.join(',')) h.party.palette = palette })
      },
      () => { if (!cancelled) setStatus('blocked') },
    )
    return () => { cancelled = true }
    // Only a new cover matters, not a new token for the same one.
  }, [key, update])
}
