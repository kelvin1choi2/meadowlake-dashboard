import { useEffect, useRef, useSyncExternalStore } from 'react'
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

/** How often to try again while the cover can't be read (Home Assistant restarting, say). */
const retryMs = 60_000

/**
 * Watches the followed zone's cover and, when it changes, saves its colors to the party lights.
 * Runs wherever the dashboard is open and connected; each open dashboard comes to the same colors.
 * The cover is fetched through Home Assistant's picture address with a fresh marker each time, so the
 * browser can't reuse the copy it loaded for the Now Playing card, which it fetched without
 * asking Home Assistant's permission to read the pixels (nor a failed try from before HA allowed it).
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
      readCover(`${url}${url.includes('?') ? '&' : '?'}palette=${Date.now()}`).then(
        (palette) => {
          if (cancelled) return
          setStatus('ok')
          if (palette.length) update((h) => { if (h.party && h.party.palette.join(',') !== palette.join(',')) h.party.palette = palette })
        },
        () => {
          if (cancelled) return
          setStatus('blocked')
          timer = setTimeout(attempt, retryMs)
        },
      )
    }
    attempt()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [key, update])
}
