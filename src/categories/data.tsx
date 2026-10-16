import { Bar, Card, Chip, Dot, KV, Ring } from '../widgets'
import type { NasTask, NasVolume } from '../data/types'
import type { Category } from './types'

const taskColor = (t: NasTask) => (t.ok === null ? 'var(--faint)' : t.ok ? 'var(--good)' : 'var(--bad)')
/** A volume this full turns amber and is named in the tile's chip. */
const NEARLY_FULL = 0.85
const usedShare = (v: NasVolume) => (v.totalTB ? v.usedTB / v.totalTB : 0)
const nearlyFull = (v: NasVolume) => usedShare(v) >= NEARLY_FULL
const freeTB = (v: NasVolume) => Math.max(0, v.totalTB - v.usedTB).toFixed(1)
const sumTB = (vs: NasVolume[], k: 'usedTB' | 'totalTB') => Math.round(vs.reduce((a, v) => a + v[k], 0) * 10) / 10

const taskResult = (t: NasTask) => (t.ok === null ? 'Waiting' : t.ok ? 'OK' : 'Failed')

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
    const late = h.scripts.filter((s) => s.status !== 'ok').length
    return late ? { tone: 'warn', label: `${late} script${late > 1 ? 's' : ''} late` } : { tone: 'good', label: 'All good' }
  },
  Tile: ({ house }) => {
    const n = house.nas
    const ok = house.scripts.filter((s) => s.status === 'ok').length
    return (
      <div className="vols">
        <div className="vol-rings">
          {n.volumes.map((v) => (
            <div key={v.name}>
              <Ring value={usedShare(v)} color={nearlyFull(v) ? 'var(--warn)' : 'var(--data)'} />
              <b>{v.name}</b>
              <span className="num">{v.usedTB} / {v.totalTB} TB</span>
            </div>
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
          <div><Dot color={ok === house.scripts.length ? 'var(--good)' : 'var(--warn)'} />Windows scripts<span className="r">{ok} of {house.scripts.length} on time</span></div>
        </div>
      </div>
    )
  },
  Sheet: ({ house }) => {
    const n = house.nas
    return (
      <>
        <Card wide color="var(--data)" title="Backup and sync tasks"
          chip={<Chip tone={n.tasks.some((t) => t.ok === false) ? 'bad' : 'good'}>{n.tasks.some((t) => t.ok === false) ? 'Needs attention' : 'All OK'}</Chip>}>
          <div className="tw">
            <table>
              <thead><tr><th>Task</th><th>App</th><th>Last report</th><th>Result</th></tr></thead>
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
        </Card>
        <Card color="var(--data)" title={n.model} chip={<Chip tone="good">{n.raid}</Chip>}>
          <Bar value={sumTB(n.volumes, 'usedTB') / (sumTB(n.volumes, 'totalTB') || 1)} />
          <KV rows={[...n.volumes.map((v): [string, string] => [v.name, `${v.usedTB} / ${v.totalTB} TB${v.status ? ` · ${v.status}` : ''}`]), ['CPU / RAM', `${n.cpuPct}% / ${n.ramPct}%`], ['Uptime', `${n.uptimeDays} days`], ['DSM', n.dsm]]} />
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
        <Card wide color="var(--data)" title={`Backups, last ${n.backupNights.length} nights`}>
          <div className="nights" role="img" aria-label={`${n.backupNights.filter(Boolean).length} of ${n.backupNights.length} nights succeeded`}>
            {n.backupNights.map((ok, i) => <span key={i} className={ok ? 'ok' : 'miss'} />)}
          </div>
          <KV rows={[[n.backupTarget, n.backupLast], ['Cloud Sync', n.cloudSync], ['Last missed run', n.lastMiss ?? 'None']]} />
        </Card>
        <Card wide title="Windows 11 scripts">
          <div className="tw">
            <table>
              <thead><tr><th>Script</th><th>Schedule</th><th>Last run</th><th>Result</th></tr></thead>
              <tbody>
                {house.scripts.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td><td>{s.schedule}</td><td className="num">{s.lastRun}</td>
                    <td className={`result ${s.status}`}>{s.status === 'ok' ? 'OK' : s.status === 'late' ? 'Late' : 'Failed'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Mac Mini" chip={<Chip tone="good">Up</Chip>}>
          <KV rows={[['Uptime', `${house.macMini.uptimeDays} days`], ...house.macMini.services.map((s): [string, string] => [s.name, s.up ? 'Running' : 'Stopped'])]} />
        </Card>
      </>
    )
  },
}
