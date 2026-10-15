// The whole house as the dashboard sees it. Sample data and (later) Home Assistant
// both produce this shape, so widgets never care where the numbers came from.

export type CategoryId =
  | 'inside'
  | 'outside'
  | 'media'
  | 'data'
  | 'appliances'
  | 'safety'
  | 'chores'
  | 'scenes'

export type Tone = 'good' | 'warn' | 'bad' | 'neutral'

export interface Room {
  id: string
  name: string
  /** Missing when the room has no temperature sensor linked. */
  tempF?: number
  occupied: boolean
  lightsOn: number
  lightsTotal: number
  fan?: boolean
}

export interface RoonZone {
  name: string
  state: 'playing' | 'paused' | 'idle'
  track?: string
  artist?: string
  album?: string
  volume?: string
  progress?: number
}

export interface Screen {
  id: string
  name: string
  on: boolean
  /** A TV, as opposed to a streaming box. The Media tile lists TVs. */
  tv?: boolean
}

export interface Drive {
  bay: number
  tempC: number
  hours?: number
  status: string
}

export interface ScriptRun {
  name: string
  schedule: string
  lastRun: string
  status: 'ok' | 'late' | 'failed'
}

export interface HouseState {
  mode: 'home' | 'away' | 'night' | 'guests'
  climate: {
    currentF: number
    setpointF: number
    mode: string
    action: string
    humidity: number
    comfort: string
    filterDays?: number
  }
  rooms: Room[]
  weather: {
    tempF: number
    feelsF: number
    condition: string
    high: number
    low: number
    /** Air quality, pollen and UV come from sample data only; there's no source for them yet. */
    aqi?: number
    pollen?: string
    uv?: number
    wind: string
    sunrise: string
    sunset: string
    rainNote: string
    hourly: { label: string; tempF: number }[]
    daily: { day: string; high: number; low: number }[]
  }
  cameras: { name: string; lastMotion: string | null }[]
  camerasArmed: boolean
  irrigation: {
    rainSkip: boolean
    rain48hIn: number
    zones: { name: string; next: string; minutes: number }[]
  }
  media: {
    roon: RoonZone[]
    plex: {
      up: boolean
      /** Transcoding and new titles come from sample data only; Home Assistant doesn't report them. */
      streams: { client: string; title: string; transcoding?: boolean }[]
      addedThisWeek?: number
    }
    screens: Screen[]
  }
  nas: {
    model: string
    dsm: string
    usedTB: number
    totalTB: number
    raid: string
    cpuPct: number
    ramPct: number
    uptimeDays: number
    drives: Drive[]
    /** One entry per night, oldest first. true = backup succeeded. */
    backupNights: boolean[]
    backupLast: string
    backupTarget: string
    cloudSync: string
    lastMiss: string | null
  }
  scripts: ScriptRun[]
  macMini: { uptimeDays: number; services: { name: string; up: boolean }[] }
  appliances: {
    washer: { state: string; cycle: string; minutesLeft: number; progress: number; doneAt: string }
    range: { oven: string; cooktop: string; lastUsed: string }
    waterHeater: { setpointF: number; mode: string; availablePct: number; vacation: boolean }
  }
  safety: {
    /** `since` is when the door last opened or closed. */
    garage: { open: boolean; since: string }
    leaks: { name: string; wet: boolean; battery?: number }[]
  }
  chores: {
    robovac: { state: string; battery: number; lastClean: string; next?: string; runWhenAway: boolean }
    upkeep: { label: string; due: string; soon?: boolean }[]
  }
  scenes: { id: string; name: string; detail: string }[]
  /** Today's notable events, newest first. */
  pulse: { category: CategoryId; who: string; what: string; at: string }[]
}
