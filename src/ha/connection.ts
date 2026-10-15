import {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  type Connection,
  type HassEntities,
} from 'home-assistant-js-websocket'

// Home Assistant connection, not yet used by the UI.
// Next step: map entity IDs in ./entities.ts onto HouseState inside useHouse().
//
// Security: the Home Assistant URL and token are entered on the tablet itself and
// kept in that browser's storage. They are never read from build-time env vars,
// because anything in a Vite env var is baked into the public JavaScript bundle.
// So the demo build on GitHub Pages has no way to reach or control the house.

const STORAGE_KEY = 'meadowlake.ha'

export function haConfig(): { url: string; token: string } | null {
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

export async function connectToHA(url: string, token: string): Promise<Connection> {
  const auth = createLongLivedTokenAuth(url, token)
  return createConnection({ auth })
}

export function watchEntities(conn: Connection, onChange: (entities: HassEntities) => void): () => void {
  return subscribeEntities(conn, onChange)
}
