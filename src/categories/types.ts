import type { FC } from 'react'
import type { RunAction, UpdateHouse } from '../data/useHouse'
import type { CategoryId, HouseState, Tone } from '../data/types'

export interface CategoryProps {
  house: HouseState
  update: UpdateHouse
  run: RunAction
  notify: (message: string) => void
}

export interface Category {
  id: CategoryId
  name: string
  /** Spans two grid columns on tablet and desktop. */
  wide?: boolean
  /** Spans the whole row on every screen size. */
  full?: boolean
  /** The pill in the tile's corner; null hides it. */
  status: (house: HouseState) => { tone: Tone; label: string } | null
  Tile: FC<CategoryProps>
  /** The full-category view. Tiles without one are not tappable. */
  Sheet?: FC<CategoryProps>
}
