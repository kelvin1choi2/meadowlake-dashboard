import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import { lightPresets } from '../data/lightPresets'
import type { Room, Scene } from '../data/types'
import type { RunAction } from '../data/useHouse'
import { roomScenes } from '../ha/sceneUse'
import { Card, Chip, Dimmer, KV, Toggle } from '../widgets'
import { tempColor } from '../widgets/geometry'
import { useHold } from '../widgets/useHold'
import { distinctTones } from './sceneTone'
import { SceneButton } from './scenes'
import type { Category, CategoryProps } from './types'

// The tile opens the sheet when tapped, so its own buttons keep their taps to themselves.
const own = { onClick: (e: MouseEvent) => e.stopPropagation(), onKeyDown: (e: KeyboardEvent) => e.stopPropagation() }

/** A room on the tile: tap switches its lights, press and hold charts its temperature. */
function RoomChip({ room, update, notify, showHistory }: { room: Room } & Pick<CategoryProps, 'update' | 'notify' | 'showHistory'>) {
  const canSwitch = room.lightsTotal > 0
  const chart = () => room.tempF !== undefined && showHistory({ category: 'inside', key: { room: room.id }, title: `${room.name} temperature`, unit: '°' })
  const { handlers, wasHeld } = useHold(chart)
  const tap = (e: MouseEvent) => {
    own.onClick(e)
    if (wasHeld()) return
    if (!canSwitch) return chart()
    const on = room.lightsOn === 0
    update((h) => { const r = h.rooms.find((x) => x.id === room.id); if (r) r.lightsOn = on ? r.lightsTotal : 0 })
    notify(`${room.name} lights ${on ? 'on' : 'off'}`)
  }
  const lit = room.lightsOn > 0
  return (
    <button type="button" className={`room${lit ? ' lit' : ''}`} {...handlers} onClick={tap} onKeyDown={own.onKeyDown}
      aria-label={canSwitch ? `${room.name}: lights ${lit ? 'on' : 'off'}. Tap to switch, hold for temperature history.` : `${room.name}: temperature history`}
      style={{ '--tc': room.tempF === undefined ? 'var(--surface-2)' : tempColor(room.tempF) } as CSSProperties}>
      <div className="n">{room.name}</div>
      {room.tempF === undefined
        ? <div className="v num">{room.lightsOn}<small>/{room.lightsTotal} on</small></div>
        : <div className="v num">{room.tempF}°</div>}
      {canSwitch && <span className="bulb" aria-hidden="true" />}
    </button>
  )
}

export const inside: Category = {
  id: 'inside',
  name: 'Inside',
  apps: ['ecobee', 'hue'],
  wide: true,
  status: () => ({ tone: 'good', label: 'Comfortable' }),
  Tile: ({ house, update, notify, showHistory }) => {
    const lightsOn = house.rooms.reduce((n, r) => n + r.lightsOn, 0)
    const lightsTotal = house.rooms.reduce((n, r) => n + r.lightsTotal, 0)
    return (
      <>
        <div className="stats">
          <div className="stat">
            <div className="lbl">Thermostat</div>
            <div className="tile-therm">
              <button type="button" className="step sm" aria-label="Lower set point" onKeyDown={own.onKeyDown}
                onClick={(e) => { own.onClick(e); update((h) => { h.climate.setpointF -= 1 }) }}>−</button>
              <div className="v num">{house.climate.currentF}°<small> {house.climate.mode.toLowerCase()} to {house.climate.setpointF}</small></div>
              <button type="button" className="step sm" aria-label="Raise set point" onKeyDown={own.onKeyDown}
                onClick={(e) => { own.onClick(e); update((h) => { h.climate.setpointF += 1 }) }}>+</button>
            </div>
          </div>
          <div className="stat">
            <div className="lbl">Lights on</div>
            <div className="v num">{lightsOn}<small> of {lightsTotal}</small></div>
          </div>
          <div className="stat">
            <div className="lbl">Humidity</div>
            <div className="v num">{house.climate.humidity}<small>%</small></div>
          </div>
        </div>
        <div className="rooms">
          {house.rooms.map((r) => <RoomChip key={r.id} room={r} update={update} notify={notify} showHistory={showHistory} />)}
        </div>
      </>
    )
  },
  Sheet: ({ house, update, run, notify, showHistory }) => (
    <>
      <Card title="Ecobee thermostat" chip={<Chip tone="good">{house.climate.action}</Chip>}>
        <div className="therm">
          <button className="step" aria-label="Lower set point" onClick={() => update((h) => { h.climate.setpointF -= 1 })}>−</button>
          <div>
            <div className="lbl">Set point</div>
            <div className="v num">{house.climate.setpointF}°</div>
          </div>
          <button className="step" aria-label="Raise set point" onClick={() => update((h) => { h.climate.setpointF += 1 })}>+</button>
        </div>
        <KV rows={[
          ['Mode', house.climate.mode],
          ['Comfort setting', house.climate.comfort],
          ...(house.climate.filterDays === undefined ? [] : [['Filter change', `${house.climate.filterDays} days`] as [string, string]]),
        ]} />
      </Card>
      {house.rooms.map((r, i) => (
        <Card key={r.id} title={r.name} color="var(--inside)" chip={<Chip tone={r.occupied ? 'good' : 'neutral'}>{r.occupied ? 'Occupied' : 'Empty'}</Chip>}>
          <div className="row">
            {r.tempF !== undefined && (
              <button type="button" className="v num room-temp" style={{ color: tempColor(r.tempF) }} aria-label={`${r.name} temperature history`}
                onClick={() => showHistory({ category: 'inside', key: { room: r.id }, title: `${r.name} temperature`, unit: '°' })}>
                {r.tempF}°<span className="chart-hint">24h</span>
              </button>
            )}
            {r.lightsTotal > 0 && <KV rows={[['Lights', r.lightsOn ? `${r.lightsOn} of ${r.lightsTotal} on` : 'Off']]} />}
          </div>
          {r.lightsTotal > 0 && (
            <Toggle
              label="Hue lights"
              on={r.lightsOn > 0}
              onChange={(on) => update((h) => { h.rooms[i].lightsOn = on ? h.rooms[i].lightsTotal : 0 })}
            />
          )}
          {r.lightsTotal > 0 && (
            <Dimmer label="Brightness" value={r.lightsOn > 0 ? r.brightness ?? 100 : 0}
              onCommit={(v) => update((h) => { h.rooms[i].brightness = v; if (!h.rooms[i].lightsOn) h.rooms[i].lightsOn = h.rooms[i].lightsTotal })} />
          )}
          {r.lightsTotal > 0 && (house.scenes.some((s) => s.room === r.name) ? (
            <RoomScenes scenes={roomScenes(house.scenes, r.name)} run={run} notify={notify} />
          ) : (
            <div className="presets" role="group" aria-label={`${r.name} light presets`}>
              {lightPresets.filter((p) => r.color || !p.color).map((p) => (
                <button key={p.id} type="button" className="preset" style={{ '--pc': `var(--preset-${p.id})` } as CSSProperties}
                  onClick={() => { run({ lights: { room: r.id, preset: p.id } }); notify(`${r.name} · ${p.name}`) }}>
                  {p.name}
                </button>
              ))}
            </div>
          ))}
          {r.fan !== undefined && (
            <Toggle label="Ceiling fan" on={r.fan} onChange={(on) => update((h) => { h.rooms[i].fan = on })} />
          )}
        </Card>
      ))}
    </>
  ),
}

/** A room's Hue scenes, most used first, colored like the Scenes tile. */
function RoomScenes({ scenes, run, notify }: { scenes: Scene[]; run: RunAction; notify: (m: string) => void }) {
  const tones = distinctTones(scenes.map((s) => s.name))
  return (
    <div className="scenes room-scenes" role="group" aria-label="Scenes">
      {scenes.map((s, i) => <SceneButton key={s.id} scene={s} tone={tones[i]} run={run} notify={notify} />)}
    </div>
  )
}
