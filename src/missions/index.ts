import type { AnyMission } from '../game/types'
import { junoMission } from './juno'
import { smapMission } from './smap'
import { uranusMission } from './uranus'

export const MISSIONS: AnyMission[] = [smapMission, junoMission, uranusMission]
