import type { AppId } from '../apps/apps'
import type { HouseState } from '../data/types'

// Everything that gets a banner above the rail, each with what can be done about it.
// Pure, so it's unit tested; Alerts.tsx draws them and remembers dismissals and snoozes.

/** A volume this full gets a banner, and turns amber on the Data tile. */
export const NEARLY_FULL = 0.85

export type AlertButton =
  | { snooze: number }
  | { dismiss: true }
  /** Opens an app; `launch` is added to a web address (DSM opens that app inside it). */
  | { app: AppId; label: string; launch?: string }

export interface HouseAlert {
  /** Changes when there's something new to say, so a dismissal only covers what was seen. */
  id: string
  tone: 'bad' | 'warn' | 'neutral'
  title: string
  detail: string
  buttons: AlertButton[]
}

export function houseAlerts(h: HouseState): HouseAlert[] {
  const alerts: HouseAlert[] = []
  for (const l of h.safety.leaks.filter((x) => x.wet)) {
    alerts.push({ id: `leak@${l.name}`, tone: 'bad', title: `Leak: ${l.name.toLowerCase()} sensor is wet`, detail: 'Check it now', buttons: [{ snooze: 30 }] })
  }
  for (const t of h.nas.tasks.filter((x) => x.ok === false)) {
    alerts.push({
      id: t.reportId,
      tone: 'bad',
      title: `${t.name} failed`,
      detail: `${t.app} · ${t.when}${t.detail ? ` · ${t.detail}` : ''}`,
      buttons: [{ app: 'dsm', label: 'Open DSM' }, { dismiss: true }],
    })
  }
  for (const l of h.safety.locks.filter((x) => x.state === 'jammed')) {
    alerts.push({ id: `jammed@${l.name}@${l.since}`, tone: 'bad', title: `${l.name} lock is jammed`, detail: `Since ${l.since}: check the door`, buttons: [{ app: 'home', label: 'Open Home' }, { snooze: 30 }] })
  }
  const g = h.safety.garage
  if (g.open) {
    alerts.push({ id: `garage@${g.since}`, tone: 'warn', title: 'Garage door is open', detail: `Since ${g.since}`, buttons: [{ app: 'home', label: 'Open Home' }, { snooze: 30 }] })
  }
  const w = h.appliances.washer
  if (w.state === 'Done') {
    alerts.push({ id: `washer@${w.doneAt}`, tone: 'neutral', title: 'Washer is done', detail: [w.doneAt !== '—' && `Finished ${w.doneAt}`, w.cycle !== '—' && w.cycle].filter(Boolean).join(' · ') || 'Ready to unload', buttons: [{ snooze: 30 }, { dismiss: true }] })
  }
  for (const v of h.nas.volumes) {
    const share = v.totalTB ? v.usedTB / v.totalTB : 0
    if (share < NEARLY_FULL) continue
    alerts.push({
      id: `volume@${v.name}`,
      tone: 'warn',
      title: `${v.name} is ${Math.round(share * 100)}% full`,
      detail: `${Math.max(0, v.totalTB - v.usedTB).toFixed(1)} TB free of ${v.totalTB} TB`,
      buttons: [{ app: 'dsm', label: 'Storage Manager', launch: '?launchApp=SYNO.SDS.StorageManager.Instance' }, { dismiss: true }],
    })
  }
  return alerts
}

/** Alerts still to show, given dismissed ids and snoozes (id → until, in ms). */
export function visibleAlerts(alerts: HouseAlert[], dismissed: string[], snoozed: Record<string, number>, now: number): HouseAlert[] {
  return alerts.filter((a) => !dismissed.includes(a.id) && !((snoozed[a.id] ?? 0) > now))
}
