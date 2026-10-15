import type { Rock, RockCommand } from '../data/types'

/**
 * The Roon ROCK's own web page (Roon OS) talks to a small HTTP API on the box:
 * `GET /1/getstate` for status and `POST /1/<command>` for actions. It has no login and
 * answers any origin, so the dashboard calls it directly from the home network.
 */

const paths: Record<RockCommand, string> = {
  restartRoon: '1/restartsoftware',
  stopRoon: '1/stopsoftware',
  reboot: '1/reboot',
  powerOff: '1/poweroff',
  eject: '1/eject',
}

export async function fetchRock(base: string, signal?: AbortSignal): Promise<Rock> {
  const res = await fetch(new URL('1/getstate', base), { signal, cache: 'no-store' })
  if (!res.ok) throw new Error(`ROCK answered ${res.status}`)
  return parseRock(await res.json())
}

/** Sends a command. A POST with no body, as the ROCK's own page does. */
export async function sendRock(base: string, command: RockCommand): Promise<void> {
  let res: Response
  try {
    res = await fetch(new URL(paths[command], base), { method: 'POST' })
  } catch (e) {
    // A reboot or power-off can drop the connection before the answer arrives.
    if (command === 'reboot' || command === 'powerOff') return
    throw e
  }
  const body = (await res.json().catch(() => ({}))) as { status?: string }
  if (!res.ok || (body.status && body.status !== 'Success')) throw new Error(body.status ?? `ROCK answered ${res.status}`)
}

type Json = Record<string, unknown>
const obj = (v: unknown): Json => (v && typeof v === 'object' ? (v as Json) : {})
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined)

/** "60605" (seconds) or "D:H:M:S" → seconds. */
export function seconds(v: unknown): number | undefined {
  if (typeof v === 'number') return v
  if (typeof v !== 'string' || !v) return undefined
  const parts = v.split(':').map(Number)
  if (parts.some((n) => !Number.isFinite(n))) return undefined
  const scale = [86400, 3600, 60, 1].slice(-parts.length)
  return parts.reduce((sum, n, i) => sum + n * scale[i], 0)
}

/** The ROCK reports disk sizes in KB. */
const gb = (kb: unknown) => (typeof kb === 'number' ? Math.round((kb / 1024 / 1024) * 10) / 10 : undefined)

/** " production" adds nothing on screen. */
const version = (v: unknown) => (str(v) ?? 'Unknown').replace(/\s+production$/, '')

export function parseRock(json: unknown): Rock {
  const root = obj(json)
  if (root.status !== 'Success') throw new Error(String(root.status ?? 'No status'))
  const data = obj(root.data)
  const state = obj(data.state)

  const used = gb(state.data_used)
  const total = gb(state.data_total)

  const internal = state.internal_storage ? obj(state.internal_storage) : undefined
  const music = internal
    ? internal.mounted
      ? { used: gb(internal.data_used) ?? 0, total: gb(internal.data_total) ?? 0 }
      : ('not mounted' as const)
    : undefined

  const ifaces = Array.isArray(data.interfaces) ? data.interfaces.map(obj) : []
  const iface = ifaces.find((i) => str(obj(i.state).ip)) ?? ifaces[0]
  const net = obj(iface?.state)
  const config = obj(iface?.config)

  return {
    status: 'up',
    model: str(data.device_model) ?? 'Roon ROCK',
    os: version(data.device_display_version),
    roon: !state.roon_running ? 'stopped' : state.has_ffmpeg === false ? 'missing-codecs' : 'running',
    roonVersion: version(state.roon_version),
    roonUptime: state.roon_running ? seconds(state.roon_uptime) : undefined,
    uptime: seconds(state.uptime),
    disk: used !== undefined && total ? { used, total } : undefined,
    music,
    ip: str(net.ip),
    dhcp: iface ? config.use_dhcp === true : undefined,
    gateway: str(net.gateway),
    dns: str(net.dns),
    cd: cdState(obj(state.cd)),
  }
}

function cdState(cd: Json): { label: string; canEject: boolean } | undefined {
  switch (cd.status) {
    case undefined:
    case 'no_cd_rom':
      return undefined
    case 'waiting':
      return { label: 'No disc', canEject: true }
    case 'ripping':
      return { label: cd.track && cd.track_count ? `Ripping track ${cd.track} of ${cd.track_count}` : 'Ripping', canEject: false }
    case 'success':
      return { label: 'Disc ripped', canEject: true }
    case 'fail':
      return { label: str(cd.error) ? `Rip failed: ${cd.error}` : 'Rip failed', canEject: true }
    default:
      return { label: String(cd.status), canEject: true }
  }
}

/** 60605 → "16h 50m", 3 days → "3d 5h". */
export function duration(s: number | undefined): string {
  if (s === undefined) return '—'
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d) return `${d}d ${h}h`
  if (h) return `${h}h ${m}m`
  return `${m}m`
}
