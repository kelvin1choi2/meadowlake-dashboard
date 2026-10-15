import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Connection, HassEntities } from 'home-assistant-js-websocket'
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
 * `update` still changes local state only; turning it into service calls comes next.
 */
export function useHouse(): { house: HouseState; update: UpdateHouse; link: Link } {
  const [local, setLocal] = useState<HouseState>(() => structuredClone(sampleHouse))
  const [states, setStates] = useState<HassEntities | null>(null)
  const [conn, setConn] = useState<'sample' | 'connecting' | 'error'>(() => (haConfig() ? 'connecting' : 'sample'))

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
      },
      () => { if (!cancelled) setConn('error') },
    )
    return () => {
      cancelled = true
      unsubscribe?.()
      connection?.close()
    }
  }, [])

  const update = useCallback<UpdateHouse>((change) => {
    setLocal((prev) => {
      const next = structuredClone(prev)
      change(next)
      return next
    })
  }, [])

  return useMemo(() => {
    if (!states) return { house: local, update, link: { status: conn } as Link }
    const { house, linked, total } = applyEntities(local, states)
    const entityList = () =>
      Object.values(states)
        .map((e) => `${e.entity_id}  ${String(e.attributes.friendly_name ?? '')}`.trimEnd())
        .sort()
        .join('\n')
    return { house, update, link: { status: 'live', linked, total, entityList } }
  }, [local, states, conn, update])
}
