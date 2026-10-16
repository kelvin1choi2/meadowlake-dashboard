import { appliances } from './appliances'
import { chores } from './chores'
import { data } from './data'
import { inside } from './inside'
import { media } from './media'
import { outside } from './outside'
import { safety } from './safety'
import { scenes } from './scenes'
import type { Category } from './types'

/** Tile order on the grid: three rows of four columns, then Data across the bottom. */
export const categories: Category[] = [inside, outside, media, appliances, safety, chores, scenes, data]

export type { Category, CategoryProps } from './types'
