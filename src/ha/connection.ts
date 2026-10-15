import {
  ERR_CANNOT_CONNECT,
  ERR_INVALID_AUTH,
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  type Connection,
  type HassEntities,
} from 'home-assistant-js-websocket'

// Home Assistant connection, used by useHouse() once an address and token are saved.
//
// Security: the Home Assistant URL and token are entered on the tablet itself and
// kept in that browser's storage. They are never read from build-time env vars,
// because anything in a Vite env var is baked into the public JavaScript bundle.
// So the demo build on GitHub Pages has no way to reach or control the house.
// On top of that, the demo build (VITE_DEMO=1, set in pages.yml) never connects
// and has no settings screen, even if a visitor's browser has a saved token.

const STORAGE_KEY = 'meadowlake.ha'

export const liveAllowed = import.meta.env.VITE_DEMO !== '1'

export function haConfig(): { url: string; token: string } | null {
  if (!liveAllowed) return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { url?: unknown; token?: unknown }
    return typeof parsed.url === 'string' && typeof parsed.token === 'string' && parsed.url && parsed.token
      ? { url: parsed.url, token: parsed.token }
      : null
  } catch {
    return null
  }
}

export function saveHaConfig(url: string, token: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, token }))
}

export function clearHaConfig(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/** Accepts what people type ("192.168.1.5:8123", "http://ha.local:8123/") and returns a base URL, or null. */
export function normalizeHaUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
  try {
    const u = new URL(withScheme)
    return `${u.protocol}//${u.host}`
  } catch {
    return null
  }
}

/** A sentence for the settings screen about why connecting failed. */
export function connectErrorText(err: unknown): string {
  if (err === ERR_INVALID_AUTH) return 'Home Assistant rejected the token. Create a new one and paste it again.'
  if (err === ERR_CANNOT_CONNECT) return "Couldn't reach Home Assistant at that address. Check it opens in this browser."
  return 'Connecting failed. Check the address and token.'
}

export async function connectToHA(url: string, token: string): Promise<Connection> {
  const auth = createLongLivedTokenAuth(url, token)
  return createConnection({ auth })
}

export function watchEntities(conn: Connection, onChange: (entities: HassEntities) => void): () => void {
  return subscribeEntities(conn, onChange)
}
