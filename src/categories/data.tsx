import { Bar, Card, Chip, Dot, KV, Ring } from '../widgets'
import type { Category } from './types'

export const data: Category = {
  id: 'data',
  name: 'Data',
  status: (h) => {
    const late = h.scripts.filter((s) => s.status !== 'ok').length
    return late ? { tone: 'warn', label: `${late} script${late > 1 ? 's' : ''} late` } : { tone: 'good', label: 'All good' }
  },
  Tile: ({ house }) => {
    const n = house.nas
    const ok = house.scripts.filter((s) => s.status === 'ok').length
    return (
      <>
        <div className="row">
          <Ring value={n.usedTB / n.totalTB} color="var(--data)" />
          <div className="list grow">
            <div>Volume 1<span className="r num">{n.usedTB} / {n.totalTB} TB</span></div>
            <div>RAID<span className="r">{n.raid}</span></div>
            <div>Backup<span className="r num">{n.backupNights.at(-1) ? 'Last night ok' : 'Missed'}</span></div>
          </div>
        </div>
        <div className="list">
          <div><Dot color="var(--good)" />Cloud Sync<span className="r">{n.cloudSync}</span></div>
          <div><Dot color={ok === house.scripts.length ? 'var(--good)' : 'var(--warn)'} />Windows scripts<span className="r">{ok} of {house.scripts.length} on time</span></div>
        </div>
      </>
    )
  },
  Sheet: ({ house }) => {
    const n = house.nas
    return (
      <>
        <Card color="var(--data)" title={n.model} chip={<Chip tone="good">{n.raid}</Chip>}>
          <Bar value={n.usedTB / n.totalTB} />
          <KV rows={[['Volume 1 (SHR)', `${n.usedTB} / ${n.totalTB} TB`], ['CPU / RAM', `${n.cpuPct}% / ${n.ramPct}%`], ['Uptime', `${n.uptimeDays} days`], ['DSM', n.dsm]]} />
        </Card>
        <Card color="var(--data)" title="Drives">
          <div className="tw">
            <table>
              <thead><tr><th>Bay</th><th>Temp</th><th>Hours</th><th>Status</th></tr></thead>
              <tbody>
                {n.drives.map((d) => (
                  <tr key={d.bay}><td>Bay {d.bay}</td><td className="num">{d.tempC}°C</td><td className="num">{d.hours.toLocaleString()}</td><td>{d.status}</td></tr>
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
