// How the dashboard fills the screen. Picked with the toggle in the header and remembered on
// this device; `?view=wall` or `?view=saver` in the address overrides it, for kiosk setups.

export type View = 'standard' | 'wall' | 'saver'

export const views: { id: View; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'wall', label: '16:10' },
  { id: 'saver', label: 'Screensaver' },
]

const key = 'meadowlake.view'

export function parseView(value: string | null | undefined): View | null {
  return views.some((v) => v.id === value) ? (value as View) : null
}

/** The address wins over the saved choice; anything unknown falls back to standard. */
export function initialView(search: string, saved: string | null): View {
  return parseView(new URLSearchParams(search).get('view')) ?? parseView(saved) ?? 'standard'
}

export function loadView(): View {
  let saved: string | null = null
  try { saved = localStorage.getItem(key) } catch { /* private mode */ }
  return initialView(window.location.search, saved)
}

export function saveView(view: View) {
  try { localStorage.setItem(key, view) } catch { /* private mode: lasts until reload */ }
}
