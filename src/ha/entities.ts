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
   * Only sensors with an occupancy entity count, which skips the copies SmartThings
   * makes of the same sensors (those report presence instead).
   */
  rooms: [
    { id: 'lounge', name: 'Lounge', lights: 'light.lounge_', sensor: 'lounge' },
    { id: 'kitchen', name: 'Kitchen', lights: 'light.kitchen_' },
    { id: 'theater', name: 'Theater', lights: 'light.theater_' },
    { id: 'hallway', name: 'Hallway', lights: 'light.hallway_' },
    { id: 'master-suite', name: 'Master', lights: 'light.master_suite_', sensor: 'master' },
    { id: 'master-bath', name: 'Bath', lights: 'light.master_bathroom_' },
  ] as { id: string; name: string; lights: string; sensor?: string }[],
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
  weather: 'weather.forecast_home',
  sun: 'sun.sun',
  cameras: {
    armed: 'alarm_control_panel.blink_meadowlake',
    list: [
      { name: 'Front door', motion: 'binary_sensor.front_door_motion' },
      { name: 'Patio', motion: 'binary_sensor.patio_motion' },
    ],
  },
  irrigation: {
    rainDelay: 'switch.meadowlake_rachio_rain_delay',
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
  },
}
