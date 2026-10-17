import type { LightPreset } from './types'

/** Light presets in the order they're offered. Colour ones only show for rooms with colour bulbs. */
export const lightPresets: { id: LightPreset; name: string; color: boolean }[] = [
  { id: 'relax', name: 'Relax', color: false },
  { id: 'read', name: 'Read', color: false },
  { id: 'daylight', name: 'Daylight', color: false },
  { id: 'sunset', name: 'Sunset', color: true },
  { id: 'ocean', name: 'Ocean', color: true },
  { id: 'forest', name: 'Forest', color: true },
]
