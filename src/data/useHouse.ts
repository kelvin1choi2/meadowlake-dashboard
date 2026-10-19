import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Connection, HassEntities } from 'home-assistant-js-websocket'
import { callService } from 'home-assistant-js-websocket'
import { actionCalls, serviceCalls } from '../ha/actions'
import { roonRockUrl } from '../config/home'
import { connectToHA, haConfig, liveAllowed, watchEntities, watchForecast } from '../ha/connection'
import { entities } from '../ha/entities'
import { applyEntities, dailyForecastType, forecastSource, type Forecasts } from '../ha/map'
import { fetchHistory } from '../ha/history'
import { sampleHistory } from './history'
import { useRock } from '../rock/useRock'
import { withPickups } from './pickups'
import { sampleHouse } from './sample'
import type { FetchHistory, HouseAction, HouseState } from './types'

/**
 * Asks Home Assistant to fetch the NAS backup results now (docs/nas-alerts.md), so they're
 * current whenever the dashboard is opened, reloaded or brought back on screen. Quietly
 * does nothing if that script isn't set up.
 */
function refreshWhenOpened(c: Connection): () => void {
  let last = 0
  const refresh = () => {
    if (document.visibilityState !== 'visible' || Date.now() - last < 60_000) return
    last = Date.now()
    callService(c, 'script', 'turn_on', undefined, { entity_id: entities.nas.refresh }).catch(() => {})
  }
  refresh()
  document.addEventListener('visibilitychange', refresh)
  return () => document.removeEventListener('visibilitychange', refresh)
}

export type UpdateHouse = (change: (draft: HouseState) => void) => void
export type RunAction = (action: HouseAction) => void

export type Link =
  | { status: 'sample' }
  | { status: 'connecting' }
  | { status: 'live'; haUrl: string; linked: number; total: number; unavailable: string[]; onSample: string[]; entityList: () => string }
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
export function useHouse(onError?: (message: string) => void): { house: HouseState; update: UpdateHouse; run: RunAction; history: FetchHistory; link: Link } {
  const [local, setLocal] = useState<HouseState>(() => structuredClone(sampleHouse))
  const [states, setStates] = useState<HassEntities | null>(null)
  const [forecasts, setForecasts] = useState<Forecasts>({})
  const [conn, setConn] = useState<'sample' | 'connecting' | 'error'>(() => (haConfig() ? 'connecting' : 'sample'))
  const liveConnection = useRef<Connection | null>(null)
  const [connection, setConnection] = useState<Connection | null>(null)
  const live = useRef<{ house: HouseState; states: HassEntities } | null>(null)
  const errorRef = useRef(onError)
  errorRef.current = onError
  // The ROCK is polled straight from the home network, never from the public demo.
  const { rock, send: sendRock } = useRock(liveAllowed ? roonRockUrl : null)

  useEffect(() => {
    const cfg = haConfig()
    if (!cfg) return
    let connection: Connection | undefined
    const unsubscribers: (() => void)[] = []
    let cancelled = false
    connectToHA(cfg.url, cfg.token).then(
      (c) => {
        if (cancelled) return c.close()
        connection = c
        unsubscribers.push(watchEntities(c, setStates))
        liveConnection.current = c
        setConnection(c)
        unsubscribers.push(refreshWhenOpened(c))
      },
      () => { if (!cancelled) setConn('error') },
    )
    return () => {
      cancelled = true
      unsubscribers.forEach((u) => u())
      connection?.close()
      liveConnection.current = null
    }
  }, [])

  // Forecasts follow whichever weather entity Home Assistant has (see forecastSource).
  const weatherId = states ? forecastSource(states) : undefined
  const dailyType = dailyForecastType(weatherId ? states?.[weatherId] : undefined)
  useEffect(() => {
    if (!connection || !weatherId) return
    setForecasts({})
    const stops = [
      watchForecast(connection, weatherId, 'hourly', (hourly) => setForecasts((f) => ({ ...f, hourly }))),
      watchForecast(connection, weatherId, dailyType, (daily) => setForecasts((f) => ({ ...f, daily }))),
    ]
    return () => stops.forEach((s) => s())
  }, [connection, weatherId, dailyType])

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

  /**
   * Runs a one-tap action (see actionCalls), or a ROCK command.
   * Without Home Assistant (or, for the ROCK, off the home dashboard) it only explains why nothing happened.
   */
  const run = useCallback<RunAction>((action) => {
    if ('rock' in action) {
      if (!liveAllowed) return errorRef.current?.('This works on the dashboard at home.')
      sendRock(action.rock).catch(() => errorRef.current?.("The ROCK didn't accept that."))
      return
    }
    const c = liveConnection.current
    if (!c) {
      errorRef.current?.('This works once Home Assistant is connected.')
      return
    }
    const calls = actionCalls(action, live.current?.states)
    if (!calls.length) return errorRef.current?.("Home Assistant doesn't have anything to do that with.")
    for (const call of calls) {
      callService(c, call.domain, call.service, call.data, { entity_id: call.entityIds }).catch(() =>
        errorRef.current?.("Home Assistant didn't accept that."),
      )
    }
  }, [sendRock])

  /** The last day of readings for a chart: from Home Assistant when connected, else made up. */
  const history = useCallback<FetchHistory>(async (key) => {
    const c = liveConnection.current
    if (!c) return haConfig() ? null : sampleHistory(key, new Date())
    return fetchHistory(c, key).catch(() => null)
  }, [])

  return useMemo(() => {
    const base = rock ? { ...local, media: { ...local.media, rock } } : local
    if (!states) return { house: withPickups(base, new Date()), update, run, history, link: { status: conn } as Link }
    const { house, linked, total, unavailable, onSample } = applyEntities(base, states, new Date(), forecasts)
    // Artwork comes as a path on the Home Assistant server.
    const haUrl = haConfig()?.url
    for (const p of [...house.media.players, ...house.media.roon]) if (haUrl && p.art?.startsWith('/')) p.art = haUrl + p.art
    for (const c of house.cameras) if (haUrl && c.image?.startsWith('/')) c.image = haUrl + c.image
    live.current = { house, states }
    const entityList = () =>
      Object.values(states)
        .map((e) => `${e.entity_id}  ${String(e.attributes.friendly_name ?? '')}`.trimEnd())
        .sort()
        .join('\n')
    return { house: withPickups(house, new Date()), update, run, history, link: { status: 'live', haUrl: haUrl ?? '', linked, total, unavailable, onSample, entityList } }
  }, [local, rock, states, forecasts, conn, update, run, history])
}
