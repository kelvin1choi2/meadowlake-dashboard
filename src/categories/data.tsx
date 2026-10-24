import type { ReactNode } from 'react'
import { Bar, Card, Chip, Dot, Holdable, KV, Ring } from '../widgets'
import type { HouseState, NasTask, NasVolume, ScriptRun } from '../data/types'
import { NEARLY_FULL } from '../app/alerts'
import type { Category, HistoryChart } from './types'

const taskColor = (t: NasTask) => (t.ok === null ? 'var(--faint)' : t.ok ? 'var(--good)' : 'var(--bad)')
const usedShare = (v: NasVolume) => (v.totalTB ? v.usedTB / v.totalTB : 0)
const nearlyFull = (v: NasVolume) => usedShare(v) >= NEARLY_FULL
const freeTB = (v: NasVolume) => Math.max(0, v.totalTB - v.usedTB).toFixed(1)
const sumTB = (vs: NasVolume[], k: 'usedTB' | 'totalTB') => Math.round(vs.reduce((a, v) => a + v[k], 0) * 10) / 10

const volumeChart = (v: NasVolume): HistoryChart => ({ category: 'data', key: { volume: v.name }, title: `${v.name} space used`, unit: '%' })

const taskResult = (t: NasTask) => (t.ok === null ? 'Waiting' : t.ok ? 'OK' : 'Failed')

const scriptResult: Record<ScriptRun['status'], string> = { ok: 'OK', late: 'Late', failed: 'Failed', waiting: 'Not run yet', off: 'Off' }
const behind = (h: HouseState) => h.scripts.filter((s) => s.status === 'late' || s.status === 'failed')

function scriptsNote(r: NonNullable<HouseState['scriptsReport']>, count: number): string {
  if (!r.setUp) return "This PC's scheduled tasks show here once it reports them to Home Assistant (docs/windows-tasks.md)."
  if (!r.when) return 'Waiting for the PC to send its first report.'
  const when = `Reported by the PC ${r.when}`
  if (r.stale) return `${when}. It sends a report every 15 minutes, so it's probably off or asleep.`
  return count ? when : `${when}, with no tasks to show.`
}

/** The Windows tasks line on the tile: how many are on time, or why there's nothing to show. */
function scriptsLine(h: HouseState): { color: string; text: string } {
  const r = h.scriptsReport
  if (r && !r.setUp) return { color: 'var(--faint)', text: 'Not set up' }
  if (r?.stale) return { color: 'var(--warn)', text: 'PC not reporting' }
  if (r && !r.when) return { color: 'var(--faint)', text: 'No report yet' }
  const counted = h.scripts.filter((s) => s.status !== 'off')
  const late = behind(h).length
  return { color: late ? 'var(--warn)' : 'var(--good)', text: `${counted.length - late} of ${counted.length} on time` }
}

export const data: Category = {
  id: 'data',
  name: 'Data',
  apps: ['dsm', 'eero'],
  full: true,
  status: (h) => {
    const failed = h.nas.tasks.filter((t) => t.ok === false).length
    if (failed) return { tone: 'bad', label: failed > 1 ? `${failed} tasks failed` : 'Backup failed' }
    const full = h.nas.volumes.filter(nearlyFull)
    if (full.length) return { tone: 'warn', label: full.length > 1 ? `${full.length} volumes almost full` : `${full[0].name} almost full` }
    const pcFailed = behind(h).filter((s) => s.status === 'failed').length
    if (pcFailed) return { tone: 'warn', label: pcFailed > 1 ? `${pcFailed} PC tasks failed` : 'PC task failed' }
    const late = behind(h).length
    return late ? { tone: 'warn', label: `${late} PC task${late > 1 ? 's' : ''} late` } : { tone: 'good', label: 'All good' }
  },
  Tile: ({ house, showHistory }) => {
    const n = house.nas
    const pc = scriptsLine(house)
    return (
      <div className="vols">
        <div className="vol-rings">
          {n.volumes.map((v) => (
            <Holdable key={v.name} onHold={() => showHistory(volumeChart(v))}>
              <Ring value={usedShare(v)} color={nearlyFull(v) ? 'var(--warn)' : 'var(--data)'} />
              <b>{v.name}</b>
              <span className="num">{v.usedTB} / {v.totalTB} TB</span>
            </Holdable>
          ))}
        </div>
        <div className="vol-free">
          {n.volumes.map((v) => (
            <div key={v.name}>
              <span className="lbl">{v.name} free</span>
              <span className={`v${nearlyFull(v) ? ' low' : ''}`}>{freeTB(v)}<small> TB</small></span>
              <span className="sub">of {v.totalTB} TB</span>
            </div>
          ))}
        </div>
        <div className="list vol-tasks">
          {n.tasks.map((t) => (
            <div key={t.name}><Dot color={taskColor(t)} />{t.name}<span className="r">{t.ok === false ? 'Failed' : t.when}</span></div>
          ))}
          <div><Dot color={pc.color} />Windows tasks<span className="r">{pc.text}</span></div>
        </div>
      </div>
    )
  },
  Sheet: ({ house, showHistory }) => {
    const n = house.nas
    return (
      <>
        <Card wide color="var(--data)" title="Backup and sync tasks"
          chip={<Chip tone={n.tasks.some((t) => t.ok === false) ? 'bad' : 'good'}>{n.tasks.some((t) => t.ok === false) ? 'Needs attention' : 'All OK'}</Chip>}>
          <div className="tw">
            <table>
              <thead><tr><th>Task</th><th>App</th><th>Last run</th><th>Result</th></tr></thead>
              <tbody>
                {n.tasks.map((t) => (
                  <tr key={t.name}>
                    <td>{t.name}{t.detail && <div className="sub">{t.detail}</div>}</td><td>{t.app}</td><td className="num">{t.when}</td>
                    <td className={`result ${t.ok === false ? 'failed' : t.ok ? 'ok' : 'waiting'}`}>{taskResult(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {n.tasksChecked && <p className="checked">Checked with the NAS {n.tasksChecked}</p>}
        </Card>
        <Card wide title="Windows 11 tasks">
          {house.scripts.length > 0 && (
            <div className="tw">
              <table>
                <thead><tr><th>Task</th><th>Schedule</th><th>Last run</th><th>Result</th></tr></thead>
                <tbody>
                  {house.scripts.map((s) => (
                    <tr key={s.name}>
                      <td>{s.name}{s.detail && <div className="sub">{s.detail}</div>}</td><td>{s.schedule}</td><td className="num">{s.lastRun}</td>
                      <td className={`result ${s.status}`}>{scriptResult[s.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {house.scriptsReport && <p className="checked">{scriptsNote(house.scriptsReport, house.scripts.length)}</p>}
        </Card>
        <Card color="var(--data)" title={n.model} chip={<Chip tone="good">{n.raid}</Chip>}>
          <Bar value={sumTB(n.volumes, 'usedTB') / (sumTB(n.volumes, 'totalTB') || 1)} />
          <KV rows={[...n.volumes.map((v): [string, ReactNode] => [v.name, (
            <button key={v.name} className="linkish" onClick={() => showHistory(volumeChart(v))}>
              {v.usedTB} / {v.totalTB} TB{v.status ? ` · ${v.status}` : ''} <span className="chart-hint">24h</span>
            </button>
          )]), ['CPU / RAM', `${n.cpuPct}% / ${n.ramPct}%`], ['Uptime', `${n.uptimeDays} days`], ['DSM', n.dsm]]} />
        </Card>
        <Card color="var(--data)" title="Drives">
          <div className="tw">
            <table>
              <thead><tr><th>Bay</th><th>Temp</th><th>Hours</th><th>Status</th></tr></thead>
              <tbody>
                {n.drives.map((d) => (
                  <tr key={d.bay}><td>Bay {d.bay}</td><td className="num">{d.tempC}°C</td><td className="num">{d.hours?.toLocaleString() ?? '—'}</td><td>{d.status}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Mac Mini" chip={<Chip tone="good">Up</Chip>}>
          <KV rows={[['Uptime', `${house.macMini.uptimeDays} days`], ...house.macMini.services.map((s): [string, string] => [s.name, s.up ? 'Running' : 'Stopped'])]} />
        </Card>
        <Card wide color="var(--data)" title={`Backups, last ${n.backupNights.length} nights`}>
          <div className="nights" role="img" aria-label={`${n.backupNights.filter(Boolean).length} of ${n.backupNights.length} nights succeeded`}>
            {n.backupNights.map((ok, i) => <span key={i} className={ok ? 'ok' : 'miss'} />)}
          </div>
          <KV rows={[[n.backupTarget, n.backupLast], ['Cloud Sync', n.cloudSync], ['Last missed run', n.lastMiss ?? 'None']]} />
        </Card>
      </>
    )
  },
}
