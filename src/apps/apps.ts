import type { CategoryId } from '../data/types'
import { roonRockUrl } from '../config/home'

// Where to go to see or change a device in its own app. Each sheet's header offers the
// apps for its category (Category.apps).
//
// A browser can't tell whether an app is installed, so these are web addresses: on the iPad
// the vendor's app takes over where it supports that. Devices with no web page of their own
// open their integration in Home Assistant instead, which only works on a device that is
// connected to Home Assistant (Settings).

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
}

export const apps: Record<AppId, AppInfo> = {
  ecobee: { name: 'Ecobee', mark: 'Ec', hue: 'inside', web: 'https://www.ecobee.com/consumerportal/index.html' },
  hue: { name: 'Hue', mark: 'Hu', hue: 'inside', haDomain: 'hue' },
  blink: { name: 'Blink', mark: 'Bl', hue: 'safety', haDomain: 'blink' },
  rachio: { name: 'Rachio', mark: 'Ra', hue: 'outside', web: 'https://app.rach.io/' },
  plex: { name: 'Plex', mark: 'Px', hue: 'media', web: 'https://app.plex.tv/desktop' },
  roon: { name: 'Roon ROCK', mark: 'Ro', hue: 'media', web: roonRockUrl },
  smartthings: { name: 'SmartThings', mark: 'ST', hue: 'appliances', web: 'https://my.smartthings.com/' },
  thinq: { name: 'LG ThinQ', mark: 'LG', hue: 'appliances', haDomain: 'lg_thinq' },
  econet: { name: 'EcoNet', mark: 'EN', hue: 'appliances', haDomain: 'econet' },
  smartlife: { name: 'Smart Life', mark: 'SL', hue: 'chores', haDomain: 'tuya' },
  dsm: { name: 'Synology DSM', mark: 'DS', hue: 'data', haDomain: 'synology_dsm' },
  eero: { name: 'eero', mark: 'ee', hue: 'data', haDomain: 'eero' },
  ha: { name: 'Home Assistant', mark: 'HA', hue: 'scenes' },
}

/**
 * The address a link to `id` opens, or undefined when there's nowhere to send it from here.
 * `pageUrl` is the dashboard's own address; `haUrl` is Home Assistant's, when connected.
 */
export function appHref(id: AppId, pageUrl: string, haUrl?: string): string | undefined {
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
