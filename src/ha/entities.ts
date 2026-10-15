// Which Home Assistant entities feed which part of the dashboard, using the IDs from
// Meadowlake's Home Assistant (Settings → entity list). Anything missing here, or not
// found in Home Assistant, stays on sample data, and the header counts what's linked.
// Keep this to device IDs: no people, addresses or anything else personal, since the
// repo is public.

export const entities = {
  climate: {
    /** Ecobee isn't in Home Assistant yet; it needs pairing via HomeKit Device. */
    thermostat: 'climate.ecobee',
  },
  /**
   * Rooms come from Hue: each room's lights share an ID prefix. The Hue room group
   * itself (e.g. light.lounge_lounge) is skipped when counting lights.
   */
  rooms: [
    { id: 'lounge', name: 'Lounge', lights: 'light.lounge_' },
    { id: 'kitchen', name: 'Kitchen', lights: 'light.kitchen_' },
    { id: 'theater', name: 'Theater', lights: 'light.theater_' },
    { id: 'hallway', name: 'Hallway', lights: 'light.hallway_' },
    { id: 'master-suite', name: 'Master', lights: 'light.master_suite_' },
    { id: 'master-bath', name: 'Bath', lights: 'light.master_bathroom_' },
  ],
  weather: 'weather.forecast_home',
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
      usedTB: `sensor.choi_vault_volume_${n}_used_space`,
      usedPct: `sensor.choi_vault_volume_${n}_volume_used`,
    })),
    volumeStatus: 'sensor.choi_vault_volume_1_status',
    cpuPct: 'sensor.choi_vault_cpu_utilization_total',
    ramPct: 'sensor.choi_vault_memory_usage_real',
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
    ],
  },
  appliances: {
    waterHeater: 'water_heater.electric_water_heater',
    hotWaterPct: 'sensor.electric_water_heater_electric_water_heater_available_hot_water',
  },
  safety: {
    /** eHome garage and leak sensors aren't in Home Assistant yet. */
    garage: 'cover.garage_door',
    leaks: ['binary_sensor.leak_water_heater', 'binary_sensor.leak_laundry'],
  },
}
