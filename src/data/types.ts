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
  /** 1–100, the average of the lights that are on. Missing when they're all off or it isn't known. */
  brightness?: number
  /** Some of the room's lights can show colours, not just shades of white. */
  color?: boolean
  fan?: boolean
}

export interface RoonZone {
  /** Opaque id the dashboard uses to move or group playback; missing on sample zones without one. */
  id?: string
  name: string
  state: 'playing' | 'paused' | 'idle'
  track?: string
  artist?: string
  album?: string
  volume?: string
  progress?: number
  /** Cover art URL. */
  art?: string
  /** Names of the other zones playing in sync with this one. */
  groupedWith?: string[]
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

/** A Synology storage volume. */
export interface NasVolume {
  name: string
  usedTB: number
  totalTB: number
  /** As DSM reports it, e.g. Normal or Degraded. */
  status?: string
}

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
  /** waiting = hasn't run yet; off = disabled in Task Scheduler. */
  status: 'ok' | 'late' | 'failed' | 'waiting' | 'off'
  /** Why it's late or failed, e.g. "Should run daily" or "Exit code 0x1". */
  detail?: string
}

export interface Scene {
  id: string
  name: string
  room: string
  /** Position on the Scenes tile; scenes without one are only in the full list. */
  favorite?: number
  /** Position among its room's buttons in the Inside sheet; unpinned scenes aren't shown there. */
  pinned?: number
}

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

/** Looks a room's lights can be set to in one tap. The first three are shades of white. */
export type LightPreset = 'relax' | 'read' | 'daylight' | 'sunset' | 'ocean' | 'forest'

export type RoonCommand =
  | { transfer: { from: string; to: string } }
  | { group: { leader: string; members: string[] } }
  | { ungroup: string }

/** One-tap actions that don't change a value on screen, so they don't go through `update`. */
export type HouseAction =
  | { scene: Scene }
  | { allLightsOff: true }
  | { player: Player; command: PlayerCommand }
  | { rock: RockCommand }
  | { lights: { room: string; preset: LightPreset } }
  | { vacuum: 'start' | 'dock' }
  | { water: { valve: string; minutes: number } }
  | { waterHeaterMode: string }
  | { roon: RoonCommand }
  /** Pauses or resumes a Plex stream, by the stream's `player`. */
  | { plexToggle: string }
  /** Asks one Blink camera (by id), or every one, for a fresh picture. */
  | { cameraSnap: true; camera?: string }

/** Something the dashboard can chart over the last day. */
export type HistoryKey = { room: string } | { hotWater: true } | { volume: string }

/** Readings over the last day, oldest first; null when there's no history to show. */
export type FetchHistory = (key: HistoryKey) => Promise<{ at: Date; value: number }[] | null>

/**
 * A door lock. The UI only ever sets `state` to locked or unlocked; Home Assistant reports
 * the in-between states while the bolt moves, and jammed when it couldn't.
 */
export interface Lock {
  /** The lock's Home Assistant entity. */
  id: string
  name: string
  state: 'locked' | 'unlocked' | 'locking' | 'unlocking' | 'jammed' | 'open' | 'unknown'
  /** When it last locked or unlocked. */
  since: string
  battery?: number
  /** From the lock's door sensor, when it has one. */
  doorOpen?: boolean
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
  /** `image` is the camera's latest picture, as Blink last took it, at `shotAt`. */
  cameras: { id: string; name: string; lastMotion: string | null; image?: string; shotAt?: string }[]
  camerasArmed: boolean
  irrigation: {
    rainSkip: boolean
    rain48hIn: number
    zones: { name: string; next: string; minutes: number }[]
    /** Zones that can be watered from the dashboard. */
    valves: { id: string; name: string; running: boolean }[]
  }
  media: {
    roon: RoonZone[]
    plex: {
      up: boolean
      /** Transcoding and new titles come from sample data only; Home Assistant doesn't report them. */
      /** `player` is set when the dashboard can pause or resume that stream. */
      streams: { client: string; title: string; transcoding?: boolean; player?: string; paused?: boolean }[]
      addedThisWeek?: number
    }
    screens: Screen[]
    players: Player[]
    rock: Rock
  }
  nas: {
    model: string
    dsm: string
    volumes: NasVolume[]
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
    /** When Home Assistant last asked the NAS for these results, e.g. "Today 7:02a". */
    tasksChecked?: string
  }
  /** Scheduled tasks on the Windows PC (docs/windows-tasks.md). */
  scripts: ScriptRun[]
  /**
   * When the PC last reported its tasks, and whether that's too long ago (PC off or asleep).
   * Absent on sample data; `setUp: false` when Home Assistant has no report sensor yet.
   */
  scriptsReport?: { setUp: boolean; when?: string; stale?: boolean }
  macMini: { uptimeDays: number; services: { name: string; up: boolean }[] }
  appliances: {
    washer: { state: string; cycle: string; minutesLeft: number; progress: number; doneAt: string }
    range: { oven: string; cooktop: string; lastUsed: string }
    waterHeater: {
      setpointF: number
      mode: string
      availablePct: number
      vacation: boolean
      /** Modes it can switch to, when known. `id` is what the heater calls it. */
      modes?: { id: string; label: string }[]
      modeId?: string
    }
  }
  safety: {
    /** `since` is when the door last opened or closed. */
    garage: { open: boolean; since: string }
    leaks: { name: string; wet: boolean; battery?: number }[]
    /** Door locks (the Eufy on the door from the garage, through Matter). */
    locks: Lock[]
  }
  chores: {
    robovac: { state: string; battery: number; lastClean: string; next?: string; runWhenAway: boolean }
    upkeep: { label: string; due: string; soon?: boolean }[]
  }
  scenes: Scene[]
  /** Today's notable events, newest first. */
  pulse: { category: CategoryId; who: string; what: string; at: string }[]
}
