// Which Home Assistant entity feeds which part of the dashboard.
// The IDs below are placeholders; replace them with the real ones from
// Home Assistant → Settings → Entities once the integrations are added.

export const entities = {
  climate: {
    thermostat: 'climate.ecobee',
    rooms: {
      living: 'sensor.living_room_temperature',
      kitchen: 'sensor.kitchen_temperature',
      office: 'sensor.office_temperature',
      primary: 'sensor.primary_bedroom_temperature',
      guest: 'sensor.guest_room_temperature',
      den: 'sensor.den_temperature',
    },
  },
  weather: 'weather.home',
  nas: {
    volumeUsed: 'sensor.ds1513_volume_1_used_space',
    volumeStatus: 'sensor.ds1513_volume_1_status',
  },
  media: {
    linn: 'media_player.linn_klimax_dsm',
    ayre: 'media_player.ayre_qx_5',
    lgTv: 'media_player.lg_oled',
    sonyTv: 'media_player.sony_oled',
  },
  appliances: {
    washer: 'sensor.washer_completion_time',
    waterHeater: 'water_heater.rheem',
  },
  safety: {
    garage: 'cover.garage_door',
    leakWaterHeater: 'binary_sensor.leak_water_heater',
    leakLaundry: 'binary_sensor.leak_laundry',
  },
} as const
