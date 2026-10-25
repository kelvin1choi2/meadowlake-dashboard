// Which Home Assistant entities feed which part of the dashboard, using the IDs from
// Meadowlake's Home Assistant (Settings → entity list). Anything missing here, or not
// found in Home Assistant, stays on sample data, and the header counts what's linked.
// Keep this to device IDs: no people, addresses or anything else personal, since the
// repo is public.

export const entities = {
  climate: {
    /** Ecobee, paired through HomeKit Device. */
    thermostat: 'climate.meadowlake',
    comfort: 'select.meadowlake_current_mode',
  },
  /**
   * Rooms come from Hue: each room's lights share an ID prefix. The Hue room group
   * itself (e.g. light.lounge_lounge) is skipped when counting lights.
   * `sensor` names an Ecobee room sensor (sensor.<name>_sensor_temperature and
   * binary_sensor.<name>_sensor_occupancy). Ecobee sensors not listed here become
   * rooms of their own, named from Home Assistant, so their names stay out of the repo.
   * `scenes` are the Hue scenes offered on the room's card in the Inside sheet, in order;
   * rooms without them get the generic light presets.
   * Only sensors with an occupancy entity count, which skips the copies SmartThings
   * makes of the same sensors (those report presence instead).
   */
  rooms: [
    { id: 'lounge', name: 'Lounge', lights: 'light.lounge_', sensor: 'lounge',
      scenes: ['scene.lounge_lounge_bright_lounge', 'scene.lounge_lounge_vinyl', 'scene.lounge_lounge_barely_there'] },
    { id: 'kitchen', name: 'Kitchen', lights: 'light.kitchen_',
      scenes: ['scene.kitchen_kitchen_undercounter_only', 'scene.kitchen_kitchen_bright_kitchen', 'scene.kitchen_kitchen_night_light'] },
    { id: 'theater', name: 'Theater', lights: 'light.theater_',
      scenes: ['scene.theater_theater_bright', 'scene.theater_theater_reference_video', 'scene.theater_theater_theater_party', 'scene.theater_theater_glow'] },
    { id: 'hallway', name: 'Hallway', lights: 'light.hallway_',
      scenes: ['scene.hallway_hallway_bright', 'scene.hallway_hallway_guest_light', 'scene.hallway_hallway_blue_hallway'] },
    { id: 'master-suite', name: 'Master', lights: 'light.master_suite_', sensor: 'master',
      scenes: ['scene.master_suite_master_suite_bright', 'scene.master_suite_master_suite_romance', 'scene.master_suite_master_suite_bright_headboard'] },
    { id: 'master-bath', name: 'Bath', lights: 'light.master_bathroom_' },
  ] as { id: string; name: string; lights: string; sensor?: string; scenes?: string[] }[],
  /** Scenes for the Scenes tile, in order. Every Hue scene is listed when the tile is opened. */
  scenes: {
    favorites: [
      'scene.lounge_lounge_bright_lounge',
      'scene.lounge_lounge_vinyl',
      'scene.theater_theater_bright_video',
      'scene.kitchen_kitchen_undercounter_only',
      'scene.kitchen_kitchen_bright_kitchen',
    ],
  },
  /** Forecasts (hourly, daily) and UV: Met.no for the home location. */
  weather: 'weather.forecast_home',
  /**
   * Current conditions come from a National Weather Service station when that integration is
   * set up (a real reading rather than a forecast). It's found by its attribution, so the
   * station's name, and with it the house's whereabouts, stays out of the repo.
   */
  observedBy: /national weather service/i,
  sun: 'sun.sun',
  /** Cameras are every camera.* entity (the Blink ones), named from Home Assistant. */
  cameras: {
    armed: 'alarm_control_panel.blink_meadowlake',
  },
  irrigation: {
    /** On = Rachio skips watering for the next 24 hours. */
    rainDelay: 'switch.meadowlake_rachio_rain_delay',
    /** Zone switches are named <prefix><zone number>_<name>, e.g. switch.meadowlake_rachio_1_front_one. */
    zonePrefix: 'switch.meadowlake_rachio_',
  },
  nas: {
    volumes: [1, 2, 3].map((n) => ({
      name: `Volume ${n}`,
      usedTB: `sensor.choi_vault_volume_${n}_used_space`,
      usedPct: `sensor.choi_vault_volume_${n}_volume_used`,
      status: `sensor.choi_vault_volume_${n}_status`,
    })),
    volumeStatus: 'sensor.choi_vault_volume_1_status',
    cpuPct: 'sensor.choi_vault_cpu_utilization_total',
    ramPct: 'sensor.choi_vault_memory_usage_real',
    /**
     * Backup and sync tasks. Home Assistant's Synology integration doesn't report these,
     * so the NAS sends its notifications to a Home Assistant webhook automation that keeps
     * each task's last result in a text helper as "ok: <message>" or "failed: <message>"
     * (see docs/nas-alerts.md). The `refresh` script asks the NAS directly and writes the
     * same helpers; the dashboard runs it whenever it opens, so they're current.
     */
    refresh: 'script.nas_refresh_backups',
    tasks: [
      { name: 'RoonBackupSMB', app: 'Active Backup', entity: 'input_text.nas_roon_backup' },
      { name: 'Photos2SMB_Backup', app: 'Active Backup', entity: 'input_text.nas_photos_backup' },
      { name: 'Cloud Sync', app: 'Cloud Sync', entity: 'input_text.nas_cloud_sync' },
    ],
    drives: [1, 2, 3, 4, 5].map((n) => ({
      bay: n,
      tempC: `sensor.choi_vault_drive_${n}_temperature`,
      status: `sensor.choi_vault_drive_${n}_status`,
    })),
  },
  /**
   * Scheduled tasks on the Windows PC. A small script there (scripts/windows/report-tasks.ps1)
   * posts them to a Home Assistant webhook every 15 minutes, and a template sensor keeps the
   * list in its `tasks` attribute (docs/windows-tasks.md).
   */
  windowsTasks: 'sensor.windows_tasks',
  media: {
    /** Roon zones, by the name shown on the dashboard. */
    roon: [
      { name: 'Lounge · Linn Klimax', id: 'media_player.1_lounge_linn_klimax' },
      { name: 'Theater · Ayre QX-5', id: 'media_player.2_theater_ayre_qx_5' },
      { name: 'Master bath', id: 'media_player.master_bath' },
    ],
    screens: [
      { id: 'theater-tv', name: 'Theater TV', tv: true, entity: 'media_player.theater_tv' },
      { id: 'theater-atv', name: 'Theater Apple TV', entity: 'media_player.theater_appletv_theater_appletv' },
      { id: 'master-atv', name: 'Master Apple TV', entity: 'media_player.master_appletv_master_appletv' },
      { id: 'guest-tv', name: 'Guest TV', tv: true, entity: 'media_player.guest_room_samsung_6_series_43' },
    ],
  },
  appliances: {
    /** Samsung washer, through SmartThings. */
    washer: {
      machine: 'sensor.laundry_room_washer_machine_state',
      job: 'sensor.laundry_room_washer_job_state',
      doneAt: 'sensor.laundry_room_washer_completion_time',
      cycle: 'select.laundry_room_washer',
      waterTemp: 'select.laundry_room_washer_water_temperature',
    },
    waterHeater: 'water_heater.electric_water_heater',
    hotWaterPct: 'sensor.electric_water_heater_electric_water_heater_available_hot_water',
  },
  chores: {
    vacuum: 'vacuum.meadowlake_robovac',
    battery: 'sensor.meadowlake_robovac_battery',
    cleaningTime: 'sensor.meadowlake_robovac_cleaning_time',
  },
  safety: {
    /** eHome garage, paired through HomeKit Device. */
    garage: 'cover.garage_pod_bay_doors_garage_door',
    /** Leak detectors in Home Assistant. Once any is found, only these are shown. */
    leaks: [
      {
        name: 'Laundry',
        moisture: 'binary_sensor.laundry_room_laundry_leak_sensor_moisture',
        battery: 'sensor.laundry_room_laundry_leak_sensor_battery',
      },
    ],
    /**
     * Door locks: every lock.* entity, named as Home Assistant names it (so the door's name
     * stays out of the repo). The Eufy C34 joins through Matter, shared from Apple Home.
     * A lock.<name> may come with sensor.<name>_battery and binary_sensor.<name>_door.
     */
    lockDomain: 'lock.',
  },
}
