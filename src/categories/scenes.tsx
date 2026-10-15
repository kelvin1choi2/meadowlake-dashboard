import type { Category } from './types'

export const scenes: Category = {
  id: 'scenes',
  name: 'Scenes',
  wide: true,
  status: () => null,
  Tile: ({ house, notify }) => (
    <div className="scenes">
      {house.scenes.map((s) => (
        <button key={s.id} className="scene" onClick={() => notify(`${s.name}: once Home Assistant is connected, this runs its script.`)}>
          {s.name}
          <span>{s.detail}</span>
        </button>
      ))}
    </div>
  ),
}
