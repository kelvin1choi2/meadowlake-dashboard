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
// The ROCK and DSM are web pages on the home network either way.

export type AppId =
  | 'ecobee' | 'hue' | 'blink' | 'rachio' | 'plex' | 'roon' | 'smartthings'
  | 'thinq' | 'econet' | 'smartlife' | 'dsm' | 'eero' | 'ha'

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
}

export const apps: Record<AppId, AppInfo> = {
  ecobee: { name: 'Ecobee', mark: 'Ec', hue: 'inside', web: 'https://www.ecobee.com/consumerportal/index.html' },
  hue: { name: 'Hue', mark: 'Hu', hue: 'inside', haDomain: 'hue' },
  blink: { name: 'Blink', mark: 'Bl', hue: 'safety', haDomain: 'blink' },
  rachio: { name: 'Rachio', mark: 'Ra', hue: 'outside', web: 'https://app.rach.io/' },
  plex: { name: 'Plex', mark: 'Px', hue: 'media', web: 'https://app.plex.tv/desktop' },
  roon: { name: 'Roon ROCK', mark: 'Ro', hue: 'media', web: roonRockUrl, shortcut: false },
  smartthings: { name: 'SmartThings', mark: 'ST', hue: 'appliances', web: 'https://my.smartthings.com/' },
  thinq: { name: 'LG ThinQ', mark: 'LG', hue: 'appliances', haDomain: 'lg_thinq' },
  econet: { name: 'EcoNet', mark: 'EN', hue: 'appliances', haDomain: 'econet' },
  smartlife: { name: 'Smart Life', mark: 'SL', hue: 'chores', haDomain: 'tuya' },
  dsm: { name: 'Synology DSM', mark: 'DS', hue: 'data', haDomain: 'synology_dsm', shortcut: false },
  eero: { name: 'eero', mark: 'ee', hue: 'data', haDomain: 'eero' },
  ha: { name: 'Home Assistant', mark: 'HA', hue: 'scenes' },
}

/** The Apple Shortcut an iPad link runs for this app. */
export function shortcutName(id: AppId): string {
  return `Open ${apps[id].name}`
}

/** iPhone, or iPad (which tells websites it's a Mac, but one with a touch screen). */
export function isAppleTouch(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  return /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
}

/**
 * The address a link to `id` opens, or undefined when there's nowhere to send it from here.
 * `pageUrl` is the dashboard's own address; `haUrl` is Home Assistant's, when connected;
 * `touch` is true on an iPad or iPhone.
 */
export function appHref(id: AppId, pageUrl: string, haUrl?: string, touch = false): string | undefined {
  if (touch && apps[id].shortcut !== false) return `shortcuts://run-shortcut?name=${encodeURIComponent(shortcutName(id))}`
  if (id === 'dsm') {
    // The dashboard is served by the NAS (Web Station), so DSM is on the same host.
    const nas = nasHost(pageUrl)
    if (nas) return `http://${nas}:5000/`
  }
  if (id === 'ha') return haUrl ? `${haUrl}/config/scene/dashboard` : undefined
  const app = apps[id]
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
