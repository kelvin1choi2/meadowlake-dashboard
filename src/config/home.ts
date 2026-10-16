// Addresses of things on the home network. These are private LAN addresses: they
// only work from inside the house and give nothing away to anyone outside it.
// Never put passwords or tokens here (see src/ha/connection.ts).

/** Roon's built-in "Displays" page (Roon → Settings → Displays), straight from the ROCK. */
export const roonDisplayDirectUrl = 'http://192.168.4.41:9330/display/'

/**
 * Where the dashboard loads the Roon display from.
 *
 * The display remembers which display it is (its zone, "start automatically") in browser
 * storage. Framed from the ROCK's address inside a page from the NAS, that storage counts as
 * third-party: Safari and Brave throw it away when the browser session ends, so Roon sees a
 * new display every time. The NAS reverse-proxies port 9330 to the ROCK (docs/nas.md), so
 * loading it from the dashboard's own host keeps it first-party. `npm run dev` on localhost
 * has no proxy, so it goes to the ROCK directly.
 */
export function roonDisplayUrl(pageUrl: string): string {
  try {
    const page = new URL(pageUrl)
    if (['localhost', '127.0.0.1', '[::1]'].includes(page.hostname)) return roonDisplayDirectUrl
    return `http://${page.hostname}:9330/display/`
  } catch {
    return roonDisplayDirectUrl
  }
}

/** The Roon ROCK server's own web page: status, storage, codecs, updates and restarts. */
export const roonRockUrl = 'http://192.168.4.41/'

/** Curbside pickup days (0 = Sunday). */
export const pickups = [
  { day: 2, what: 'Garbage, lawn waste, recycling' },
  { day: 5, what: 'Garbage' },
]
