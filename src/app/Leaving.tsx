import { leave, leavingPlan, nothingToDo } from '../data/leaving'
import type { HouseState } from '../data/types'
import type { RunAction, UpdateHouse } from '../data/useHouse'
import { Card, Dot } from '../widgets'
import { ConfirmButton } from '../widgets/ConfirmButton'
import { Sheet } from './Sheet'

/** What's still on when leaving, and one confirmed tap to switch it all off and arm the cameras. */
export function Leaving({ house, update, run, notify, onClose }: {
  house: HouseState
  update: UpdateHouse
  run: RunAction
  notify: (message: string) => void
  onClose: () => void
}) {
  const plan = leavingPlan(house)
  const go = () => {
    update(leave)
    for (const player of plan.players) run({ player, command: 'play_pause' })
    if (plan.vacuum) run({ vacuum: 'start' })
    notify(plan.garageOpen ? 'All set. The garage door is still open.' : 'All set. Have a good trip.')
    onClose()
  }
  const away = () => { update((h) => { h.mode = 'away' }); onClose() }
  const rows = [
    ...plan.lights.map((n) => ({ what: `${n} lights`, does: 'Turn off' })),
    ...plan.screens.map((n) => ({ what: n, does: 'Turn off' })),
    ...plan.players.map((p) => ({ what: `${p.name}${p.title ? ` · ${p.title}` : ''}`, does: 'Pause' })),
    ...(plan.arm ? [{ what: 'Blink cameras', does: 'Arm' }] : []),
    ...(plan.vacuum ? [{ what: 'Robovac', does: 'Start cleaning' }] : []),
  ]
  return (
    <Sheet id="safety" title="Leaving" onClose={onClose} small>
      <Card wide color="var(--safety)" title={nothingToDo(plan) ? 'Nothing left on' : 'Still on'}>
        <div className="list leaving">
          {rows.map((r) => <div key={r.what}><Dot color="var(--warn)" />{r.what}<span className="r">{r.does}</span></div>)}
          {!plan.arm && <div><Dot color="var(--good)" />Blink cameras<span className="r">Already armed</span></div>}
          <div>
            <Dot color={plan.garageOpen ? 'var(--bad)' : 'var(--good)'} />Garage door
            <span className="r">{plan.garageOpen ? 'Open: close it with the remote or Apple Home' : 'Closed'}</span>
          </div>
        </div>
        <div className="leaving-btns">
          {nothingToDo(plan)
            ? <button className="btn primary" onClick={away}>Set Away</button>
            : <ConfirmButton confirm={`Tap again to ${rows.map((r) => r.does.toLowerCase()).filter((d, i, a) => a.indexOf(d) === i).join(', ')}`} onConfirm={go}>Leave: turn it all off</ConfirmButton>}
          {!nothingToDo(plan) && <button className="btn" onClick={away}>Just set Away</button>}
        </div>
      </Card>
    </Sheet>
  )
}
