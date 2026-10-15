// Picks a color for a scene button from the scene's name, so buttons are easy to tell
// apart at a glance. Each tone is a token in styles/tokens.css (--tone-<name>).

export const tones = ['sun', 'amber', 'peach', 'coral', 'rose', 'violet', 'indigo', 'blue', 'teal', 'mint', 'dusk'] as const
export type SceneTone = (typeof tones)[number]

// First match wins, so specific words come before general ones ("Bright Video" is video).
const rules: [RegExp, SceneTone][] = [
  [/video|movie|cinema|tv\b/, 'indigo'],
  [/vinyl|record|jazz/, 'amber'],
  [/undercounter|cabinet|steampunk/, 'peach'],
  [/blue|arctic|aurora|ocean|ice/, 'blue'],
  [/galaxy|star|tokyo|tunes|cosmic/, 'violet'],
  [/sunset|tiki|savanna|miami|tropical|dusk|fire/, 'coral'],
  [/ruby|rosy|romance|pink|blossom|xmas|party|magenta|floyd/, 'rose'],
  [/night|dim|barely|dark|deep|sleep/, 'dusk'],
  [/relax|read|warm|glow|ambient|tub|bath|hazy|gradient/, 'peach'],
  [/concentrate|energize|spring|wak|fresh|green/, 'mint'],
  [/bright|daylight|6500k|day/, 'sun'],
]

// When two favorites land on the same tone, the later one takes the first free tone here.
const spare: SceneTone[] = ['mint', 'teal', 'coral', 'rose', 'violet', 'blue', 'peach', 'indigo', 'amber', 'sun', 'dusk']

export function sceneTone(name: string): SceneTone {
  const n = name.toLowerCase()
  for (const [re, tone] of rules) if (re.test(n)) return tone
  // Unrecognized names still get a steady color of their own.
  let hash = 0
  for (const ch of n) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return tones[hash % tones.length]
}

/** Tones for a row of buttons, with no two alike while there are tones left. */
export function distinctTones(names: string[]): SceneTone[] {
  const used = new Set<SceneTone>()
  return names.map((name) => {
    let tone = sceneTone(name)
    if (used.has(tone)) tone = spare.find((t) => !used.has(t)) ?? tone
    used.add(tone)
    return tone
  })
}
