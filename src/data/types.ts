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

/** Anything that plays media: Roon zones, Apple TVs, TVs, HomePods. */
export interface Player {
  id: string
  name: string
  state: 'playing' | 'paused' | 'idle' | 'off'
  title?: string
  /** Artist, show or app, whichever the device reports. */
  subtitle?: string
  art?: string
  /** 0–1, when the device reports it. */
  volume?: number
  muted?: boolean
  progress?: number
  /** What the device says it can do. */
  can: { pause: boolean; next: boolean; previous: boolean; volume: boolean; mute: boolean; power: boolean }
}

export type PlayerCommand = 'play_pause' | 'next' | 'previous' | 'mute' | 'power' | { volume: number }

export interface Drive {
  bay: number
  tempC: number
  hours?: number
  status: string
}

/** A Synology backup or sync task, as last reported by the NAS. */
export interface NasTask {
  name: string
  /** The Synology app that runs it, e.g. Active Backup or Cloud Sync. */
  app: string
  /** null until the NAS has reported on this task. */
  ok: boolean | null
  when: string
  detail?: string
  /** Changes with every report, so a dismissed failure alert comes back on the next failure. */
  reportId: string
}

export interface ScriptRun {
  name: string
  schedule: string
  lastRun: string
  status: 'ok' | 'late' | 'failed'
}

export interface Scene {
  id: string
  name: string
  room: string
  /** Position on the Scenes tile; scenes without one are only in the full list. */
  favorite?: number
}

/** One-tap actions that don't change a value on screen, so they don't go through `update`. */
/** The Roon ROCK server box: what its own web page shows. */
export type Rock =
  | { status: 'checking' }
  | { status: 'unreachable' }
  | {
      status: 'up'
      model: string
      os: string
      roon: 'running' | 'missing-codecs' | 'stopped'
      roonVersion: string
      /** Seconds. */
      roonUptime?: number
      uptime?: number
      /** The ROCK's own data disk, in GB. */
      disk?: { used: number; total: number }
      /** An internal music drive, when one is fitted. */
      music?: { used: number; total: number } | 'not mounted'
      ip?: string
      dhcp?: boolean
      gateway?: string
      dns?: string
      /** Undefined when there's no CD drive. */
      cd?: { label: string; canEject: boolean }
    }

export type RockCommand = 'restartRoon' | 'stopRoon' | 'reboot' | 'powerOff' | 'eject'

export type HouseAction =
  | { scene: Scene }
  | { allLightsOff: true }
  | { player: Player; command: PlayerCommand }
  | { rock: RockCommand }

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
    players: Player[]
    rock: Rock
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
    /** Backup and sync tasks to watch, shown first and alerted on when they fail. */
    tasks: NasTask[]
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
  scenes: Scene[]
  /** Today's notable events, newest first. */
  pulse: { category: CategoryId; who: string; what: string; at: string }[]
}
