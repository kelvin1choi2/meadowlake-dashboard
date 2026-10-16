// Light or dark colors. Picked with the toggle in the header and remembered on this device;
// Auto follows the system setting, and `?theme=light` or `?theme=dark` in the address overrides it.

import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'auto'

export const themes: { id: Theme; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'auto', label: 'Auto' },
]

const key = 'meadowlake.theme'
const darkQuery = '(prefers-color-scheme: dark)'

export function parseTheme(value: string | null | undefined): Theme | null {
  return themes.some((t) => t.id === value) ? (value as Theme) : null
}

/** The address wins over the saved choice; anything unknown falls back to auto. */
export function initialTheme(search: string, saved: string | null): Theme {
  return parseTheme(new URLSearchParams(search).get('theme')) ?? parseTheme(saved) ?? 'auto'
}

/** Which palette to show: auto becomes light or dark from the system setting. */
export function resolveTheme(theme: Theme, systemDark: boolean): 'light' | 'dark' {
  return theme === 'auto' ? (systemDark ? 'dark' : 'light') : theme
}

export function loadTheme(): Theme {
  let saved: string | null = null
  try { saved = localStorage.getItem(key) } catch { /* private mode */ }
  return initialTheme(window.location.search, saved)
}

function saveTheme(theme: Theme) {
  try { localStorage.setItem(key, theme) } catch { /* private mode: lasts until reload */ }
}

/** Sets the palette on <html>, where tokens.css picks it up, and tints the browser bar to match. */
export function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme, window.matchMedia(darkQuery).matches)
  const root = document.documentElement
  root.dataset.theme = resolved
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim()
  if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
}

/** The current choice, kept applied while the system setting changes underneath Auto. */
export function useTheme() {
  const [theme, setTheme] = useState(loadTheme)
  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'auto') return
    const media = window.matchMedia(darkQuery)
    const follow = () => applyTheme('auto')
    media.addEventListener('change', follow)
    return () => media.removeEventListener('change', follow)
  }, [theme])
  const choose = (next: Theme) => {
    setTheme(next)
    saveTheme(next)
  }
  return [theme, choose] as const
}
