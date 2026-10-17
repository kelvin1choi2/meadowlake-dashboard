// Whether this Windows PC has the app helper (scripts/windows/) installed. Switched on by hand
// in Settings, because a browser can't see what's installed and an unknown link does nothing.

const key = 'meadowlake.appHelper'

export function windowsHelperOn(): boolean {
  try { return localStorage.getItem(key) === 'on' } catch { return false }
}

export function setWindowsHelper(on: boolean): void {
  try {
    if (on) localStorage.setItem(key, 'on')
    else localStorage.removeItem(key)
  } catch { /* private mode: lasts until reload */ }
}
