// Which Home Assistant entity feeds which part of the dashboard.
// The IDs below are best guesses; replace them with the real ones from
// Home Assistant → Settings → Entities, or from the list on the dashboard's
// Settings screen. An ID Home Assistant doesn't have just leaves that spot on
// sample data, and the header counts how many are linked.

export const entities = {
  climate: {
    thermostat: 'climate.ecobee',
    /** Keyed by the room ids in src/data/sample.ts. */
    rooms: {
      living: 'sensor.living_room_temperature',
      kitchen: 'sensor.kitchen_temperature',
      office: 'sensor.office_temperature',
      primary: 'sensor.primary_bedroom_temperature',
      guest: 'sensor.guest_room_temperature',
      den: 'sensor.den_temperature',
    },
  },
  weather: 'weather.forecast_home',
  nas: {
    volumeUsedTB: 'sensor.ds1513_volume_1_used_space',
    volumeStatus: 'sensor.ds1513_volume_1_status',
  },
  media: {
    /** Keyed by Roon zone name, as shown in the Media sheet. */
    roon: {
      'Linn Klimax DSM': 'media_player.linn_klimax_dsm',
      'Ayre QX-5': 'media_player.ayre_qx_5',
    } as Record<string, string>,
    /** Keyed by the screen ids in src/data/sample.ts. */
    screens: {
      lg: 'media_player.lg_webos_tv',
      sony: 'media_player.sony_bravia',
      'atv-living': 'media_player.living_room',
      'atv-den': 'media_player.den',
    } as Record<string, string>,
  },
  appliances: {
    waterHeater: 'water_heater.rheem',
  },
  safety: {
    garage: 'cover.garage_door',
    /** Same order as the leak sensors in src/data/sample.ts. */
    leaks: ['binary_sensor.leak_water_heater', 'binary_sensor.leak_laundry'],
  },
}

/** Every entity ID above, for counting how many the house actually has. */
export function allEntityIds(): string[] {
  const out: string[] = []
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.push(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(entities)
  return out
}
