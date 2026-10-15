import {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  type Connection,
  type HassEntities,
} from 'home-assistant-js-websocket'

// Home Assistant connection, not yet used by the UI.
// Next step: map entity IDs in ./entities.ts onto HouseState inside useHouse().

export function haConfig(): { url: string; token: string } | null {
  const url = import.meta.env.VITE_HA_URL as string | undefined
  const token = import.meta.env.VITE_HA_TOKEN as string | undefined
  return url && token ? { url, token } : null
}

export async function connectToHA(url: string, token: string): Promise<Connection> {
  const auth = createLongLivedTokenAuth(url, token)
  return createConnection({ auth })
}

export function watchEntities(conn: Connection, onChange: (entities: HassEntities) => void): () => void {
  return subscribeEntities(conn, onChange)
}
