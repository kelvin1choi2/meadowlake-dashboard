// Addresses of things on the home network. These are private LAN addresses: they
// only work from inside the house and give nothing away to anyone outside it.
// Never put passwords or tokens here (see src/ha/connection.ts).

/** Roon's built-in "Displays" page (Roon → Settings → Displays). */
export const roonDisplayUrl = 'http://192.168.4.41:9330/display/'

/** The Roon ROCK server's own web page: status, storage, codecs, updates and restarts. */
export const roonRockUrl = 'http://192.168.4.41/'

/** Curbside pickup days (0 = Sunday). */
export const pickups = [
  { day: 2, what: 'Garbage, lawn waste, recycling' },
  { day: 5, what: 'Garbage' },
]
