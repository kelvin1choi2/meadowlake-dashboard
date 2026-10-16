import type { CategoryId } from '../data/types'

// The apps and web pages that control each device, so a card can jump to the full UI.
// MOCKUP: `?links=a|b|c|d` picks one of the layouts Kelvin is choosing between.

export type AppId =
  | 'ecobee' | 'hue' | 'blink' | 'rachio' | 'plex' | 'roon' | 'smartthings'
  | 'thinq' | 'econet' | 'smartlife' | 'dsm' | 'eero' | 'ha'

export interface AppInfo {
  id: AppId
  name: string
  /** Two letters for the round badge (no brand logos). */
  mark: string
  /** Category hue the badge is tinted with. */
  hue: CategoryId
  web: string
}

export const apps: Record<AppId, AppInfo> = {
  ecobee: { id: 'ecobee', name: 'Ecobee', mark: 'Ec', hue: 'inside', web: 'https://www.ecobee.com/consumerportal/' },
  hue: { id: 'hue', name: 'Hue', mark: 'Hu', hue: 'inside', web: '#' },
  blink: { id: 'blink', name: 'Blink', mark: 'Bl', hue: 'safety', web: '#' },
  rachio: { id: 'rachio', name: 'Rachio', mark: 'Ra', hue: 'outside', web: 'https://app.rach.io/' },
  plex: { id: 'plex', name: 'Plex', mark: 'Px', hue: 'media', web: 'https://app.plex.tv/desktop' },
  roon: { id: 'roon', name: 'Roon', mark: 'Ro', hue: 'media', web: '#' },
  smartthings: { id: 'smartthings', name: 'SmartThings', mark: 'ST', hue: 'appliances', web: 'https://my.smartthings.com/' },
  thinq: { id: 'thinq', name: 'LG ThinQ', mark: 'LG', hue: 'appliances', web: '#' },
  econet: { id: 'econet', name: 'EcoNet', mark: 'EN', hue: 'appliances', web: '#' },
  smartlife: { id: 'smartlife', name: 'Smart Life', mark: 'SL', hue: 'chores', web: '#' },
  dsm: { id: 'dsm', name: 'Synology DSM', mark: 'DS', hue: 'data', web: '#' },
  eero: { id: 'eero', name: 'eero', mark: 'ee', hue: 'data', web: '#' },
  ha: { id: 'ha', name: 'Home Assistant', mark: 'HA', hue: 'scenes', web: '#' },
}

export type LinkStyle = 'a' | 'b' | 'c' | 'd'
export const linkStyle: LinkStyle = (() => {
  const v = new URLSearchParams(window.location.search).get('links')
  return v === 'b' || v === 'c' || v === 'd' ? v : 'a'
})()
