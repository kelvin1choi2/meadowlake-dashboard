import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import type { HouseAction, Scene } from '../data/types'
import type { RunAction } from '../data/useHouse'
import { Card } from '../widgets'
import { distinctTones, sceneTone, type SceneTone } from './sceneTone'
import type { Category } from './types'

// The tile is tappable (it opens every scene by room), so its buttons keep their taps to themselves.
const own = { onClick: (e: MouseEvent) => e.stopPropagation(), onKeyDown: (e: KeyboardEvent) => e.stopPropagation() }

export function SceneButton({ scene, room, tone, run, notify }: { scene: Scene; room?: boolean; tone: SceneTone; run: RunAction; notify: (m: string) => void }) {
  const go = (e: MouseEvent) => {
    own.onClick(e)
    run({ scene })
    notify(`${scene.room} · ${scene.name}`)
  }
  return (
    <button className="scene" style={{ '--sc': `var(--tone-${tone})` } as CSSProperties} onClick={go} onKeyDown={own.onKeyDown}>
      {scene.name}
      {room && <span>{scene.room}</span>}
    </button>
  )
}

function AllOff({ run, notify }: { run: RunAction; notify: (m: string) => void }) {
  const off: HouseAction = { allLightsOff: true }
  return (
    <button className="scene off" onKeyDown={own.onKeyDown} onClick={(e) => { own.onClick(e); run(off); notify('All lights off') }}>
      All lights off
      <span>Every room</span>
    </button>
  )
}

export const scenes: Category = {
  id: 'scenes',
  name: 'Scenes',
  apps: ['ha'],
  wide: true,
  status: () => null,
  Tile: ({ house, run, notify }) => {
    const favorites = house.scenes
      .filter((s) => s.favorite !== undefined)
      .sort((a, b) => (a.favorite ?? 0) - (b.favorite ?? 0))
    const colors = distinctTones(favorites.map((s) => s.name))
    return (
      <div className="scenes">
        {favorites.map((s, i) => <SceneButton key={s.id} scene={s} room tone={colors[i]} run={run} notify={notify} />)}
        <AllOff run={run} notify={notify} />
      </div>
    )
  },
  Sheet: ({ house, run, notify }) => {
    const rooms = [...new Set(house.scenes.map((s) => s.room))]
    return (
      <>
        <Card wide color="var(--scenes)" title="Whole house">
          <div className="scenes"><AllOff run={run} notify={notify} /></div>
        </Card>
        {rooms.map((room) => (
          <Card key={room} wide color="var(--scenes)" title={room}>
            <div className="scenes">
              {house.scenes.filter((s) => s.room === room).map((s) => <SceneButton key={s.id} scene={s} tone={sceneTone(s.name)} run={run} notify={notify} />)}
            </div>
          </Card>
        ))}
      </>
    )
  },
}
