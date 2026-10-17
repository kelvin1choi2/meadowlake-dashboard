import type { CategoryId } from '../data/types'
import { roonRockUrl } from '../config/home'

// Where to go to see or change a device in its own app. Each sheet's header offers the
// apps for its category (Category.apps).
//
// On a laptop these are web addresses. Devices with no web page of their own open their
// integration in Home Assistant instead, which only works on a device that is connected to
// Home Assistant (Settings).
//
// On an iPad or iPhone, a link runs an Apple Shortcut named "Open <app>" (docs/ipad-apps.md),
// whose one step opens the real app. Most of these apps publish no link format of their own,
// and a browser can't check whether an app is installed, so Shortcuts is the dependable way in.
// A Mac does the same for the apps that have a Mac version (`mac`). A Windows PC has no
// Shortcuts; there, once the small helper in scripts/windows/ is installed and switched on in
// Settings, links like meadowlake-app:roon open the Windows apps (`windows`). The ROCK and DSM are web
// pages on the home network either way. Apps with no web page and no Home Assistant fallback
// (Roon, Apple Home) only show where they can open.

export type AppId =
  | 'ecobee' | 'hue' | 'blink' | 'rachio' | 'plex' | 'roon' | 'rock' | 'smartthings'
  | 'thinq' | 'econet' | 'smartlife' | 'dsm' | 'eero' | 'ha' | 'home'

/** Where the dashboard is open: an iPad or iPhone, a Mac, a Windows PC with the app helper, or anything else. */
export type Device = 'touch' | 'mac' | 'windows' | 'other'

export interface AppInfo {
  name: string
  /** Two letters for the round badge. */
  mark: string
  /** Category hue the badge is tinted with. */
  hue: CategoryId
  /** The vendor's own web page, when it has one. */
  web?: string
  /** Home Assistant integration to open when there's no web page. */
  haDomain?: string
  /** False when the iPad should open the web page too (it has no app of its own). */
  shortcut?: false
  /** Has a Mac app, opened through a Shortcut like on the iPad. */
  mac?: true
  /** Has a Windows app the helper can open (scripts/windows/open-app.ps1 must list it too). */
  windows?: true
}

export const apps: Record<AppId, AppInfo> = {
  ecobee: { name: 'Ecobee', mark: 'Ec', hue: 'inside', web: 'https://www.ecobee.com/consumerportal/index.html' },
  hue: { name: 'Hue', mark: 'Hu', hue: 'inside', haDomain: 'hue' },
  blink: { name: 'Blink', mark: 'Bl', hue: 'safety', haDomain: 'blink' },
  rachio: { name: 'Rachio', mark: 'Ra', hue: 'outside', web: 'https://app.rach.io/' },
  plex: { name: 'Plex', mark: 'Px', hue: 'media', web: 'https://app.plex.tv/desktop', mac: true, windows: true },
  roon: { name: 'Roon', mark: 'Ro', hue: 'media', mac: true, windows: true },
  rock: { name: 'Roon ROCK', mark: 'RK', hue: 'media', web: roonRockUrl, shortcut: false },
  smartthings: { name: 'SmartThings', mark: 'ST', hue: 'appliances', web: 'https://my.smartthings.com/', windows: true },
  thinq: { name: 'LG ThinQ', mark: 'LG', hue: 'appliances', haDomain: 'lg_thinq' },
  econet: { name: 'EcoNet', mark: 'EN', hue: 'appliances', haDomain: 'econet' },
  smartlife: { name: 'Smart Life', mark: 'SL', hue: 'chores', haDomain: 'tuya' },
  dsm: { name: 'Synology DSM', mark: 'DS', hue: 'data', haDomain: 'synology_dsm', shortcut: false },
  eero: { name: 'eero', mark: 'ee', hue: 'data', haDomain: 'eero' },
  ha: { name: 'Home Assistant', mark: 'HA', hue: 'scenes', mac: true },
  home: { name: 'Home', mark: 'Ho', hue: 'safety', mac: true },
}

/** The Apple Shortcut an iPad or Mac link runs for this app. */
export function shortcutName(id: AppId): string {
  return `Open ${apps[id].name}`
}

/**
 * iPhone, or iPad (which tells websites it's a Mac, but one with a touch screen), or a real Mac,
 * or a Windows PC where the app helper is switched on (`windowsHelper`).
 */
export function deviceKind(userAgent: string, platform: string, maxTouchPoints: number, windowsHelper = false): Device {
  if (/iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)) return 'touch'
  if (platform.startsWith('Mac') || /Macintosh/.test(userAgent)) return 'mac'
  if (windowsHelper && isWindows(userAgent, platform)) return 'windows'
  return 'other'
}

export function isWindows(userAgent: string, platform: string): boolean {
  return platform.startsWith('Win') || /Windows NT/.test(userAgent)
}

/**
 * The address a link to `id` opens, or undefined when there's nowhere to send it from here.
 * `pageUrl` is the dashboard's own address; `haUrl` is Home Assistant's, when connected;
 * `device` is where the dashboard is open.
 */
export function appHref(id: AppId, pageUrl: string, haUrl?: string, device: Device = 'other'): string | undefined {
  const app = apps[id]
  if ((device === 'touch' && app.shortcut !== false) || (device === 'mac' && app.mac)) {
    return `shortcuts://run-shortcut?name=${encodeURIComponent(shortcutName(id))}`
  }
  if (device === 'windows' && app.windows) return `meadowlake-app:${id}`
  if (id === 'dsm') {
    // The dashboard is served by the NAS (Web Station), so DSM is on the same host.
    const nas = nasHost(pageUrl)
    if (nas) return `http://${nas}:5000/`
  }
  if (id === 'ha') return haUrl ? `${haUrl}/config/scene/dashboard` : undefined
  if (app.web) return app.web
  if (app.haDomain && haUrl) return `${haUrl}/config/integrations/integration/${app.haDomain}`
  return undefined
}

function nasHost(pageUrl: string): string | undefined {
  try {
    const page = new URL(pageUrl)
    if (page.protocol !== 'http:' || ['localhost', '127.0.0.1', '[::1]'].includes(page.hostname)) return undefined
    return page.hostname
  } catch {
    return undefined
  }
}
