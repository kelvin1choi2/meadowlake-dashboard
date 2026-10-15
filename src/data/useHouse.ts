import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Connection, HassEntities } from 'home-assistant-js-websocket'
import { callService } from 'home-assistant-js-websocket'
import { serviceCalls } from '../ha/actions'
import { connectToHA, haConfig, watchEntities } from '../ha/connection'
import { applyEntities } from '../ha/map'
import { sampleHouse } from './sample'
import type { HouseState } from './types'

export type UpdateHouse = (change: (draft: HouseState) => void) => void

export type Link =
  | { status: 'sample' }
  | { status: 'connecting' }
  | { status: 'live'; linked: number; total: number; entityList: () => string }
  | { status: 'error' }

/**
 * The single source of house state for the UI.
 *
 * With no Home Assistant saved on this device it serves sample data. Once an address
 * and token are saved (Settings), it subscribes to Home Assistant and overlays live
 * entity states on top; anything not linked yet stays on sample data.
 * While connected, `update` also sends the change to Home Assistant (see ha/actions.ts),
 * and the new state comes back through the subscription.
 */
export function useHouse(onError?: (message: string) => void): { house: HouseState; update: UpdateHouse; link: Link } {
  const [local, setLocal] = useState<HouseState>(() => structuredClone(sampleHouse))
  const [states, setStates] = useState<HassEntities | null>(null)
  const [conn, setConn] = useState<'sample' | 'connecting' | 'error'>(() => (haConfig() ? 'connecting' : 'sample'))
  const liveConnection = useRef<Connection | null>(null)
  const live = useRef<{ house: HouseState; states: HassEntities } | null>(null)
  const errorRef = useRef(onError)
  errorRef.current = onError

  useEffect(() => {
    const cfg = haConfig()
    if (!cfg) return
    let connection: Connection | undefined
    let unsubscribe: (() => void) | undefined
    let cancelled = false
    connectToHA(cfg.url, cfg.token).then(
      (c) => {
        if (cancelled) return c.close()
        connection = c
        unsubscribe = watchEntities(c, setStates)
        liveConnection.current = c
      },
      () => { if (!cancelled) setConn('error') },
    )
    return () => {
      cancelled = true
      unsubscribe?.()
      connection?.close()
      liveConnection.current = null
    }
  }, [])

  const update = useCallback<UpdateHouse>((change) => {
    const c = liveConnection.current
    if (c && live.current) {
      const before = live.current.house
      const after = structuredClone(before)
      change(after)
      for (const call of serviceCalls(before, after, live.current.states)) {
        callService(c, call.domain, call.service, call.data, { entity_id: call.entityIds }).catch(() =>
          errorRef.current?.("Home Assistant didn't accept that change."),
        )
      }
    }
    setLocal((prev) => {
      const next = structuredClone(prev)
      change(next)
      return next
    })
  }, [])

  return useMemo(() => {
    if (!states) return { house: local, update, link: { status: conn } as Link }
    const { house, linked, total } = applyEntities(local, states)
    live.current = { house, states }
    const entityList = () =>
      Object.values(states)
        .map((e) => `${e.entity_id}  ${String(e.attributes.friendly_name ?? '')}`.trimEnd())
        .sort()
        .join('\n')
    return { house, update, link: { status: 'live', linked, total, entityList } }
  }, [local, states, conn, update])
}
