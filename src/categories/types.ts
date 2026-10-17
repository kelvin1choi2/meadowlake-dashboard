import type { FC } from 'react'
import type { AppId } from '../apps/apps'
import type { RunAction, UpdateHouse } from '../data/useHouse'
import type { CategoryId, HistoryKey, HouseState, Tone } from '../data/types'

export interface CategoryProps {
  house: HouseState
  update: UpdateHouse
  run: RunAction
  notify: (message: string) => void
  /** Opens the last day's chart for a reading (press and hold on a tile, or the chart buttons in sheets). */
  showHistory: (chart: HistoryChart) => void
}

export interface HistoryChart {
  /** Whose colour the chart takes. */
  category: CategoryId
  key: HistoryKey
  title: string
  /** Shown after axis values, e.g. ° or %. */
  unit: string
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
  /** Apps that control what this category shows, offered in its sheet's header. */
  apps?: AppId[]
  Tile: FC<CategoryProps>
  /** The full-category view. Tiles without one are not tappable. */
  Sheet?: FC<CategoryProps>
}
