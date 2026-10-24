import { appliances } from './appliances'
import { chores } from './chores'
import { data } from './data'
import { inside } from './inside'
import { media } from './media'
import { outside } from './outside'
import { safety } from './safety'
import { scenes } from './scenes'
import type { Category } from './types'

/** Tile order on the grid: Data across the top, then three rows of four columns. */
export const categories: Category[] = [data, inside, outside, media, appliances, safety, chores, scenes]

export type { Category, CategoryProps } from './types'
