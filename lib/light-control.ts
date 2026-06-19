import {
  HUE_DEFAULT_STANDBY_COLOR,
  getHueRepresentativeColor,
  type HueMode,
} from '@/lib/hue-presets'
import type { PreparationMode } from '@/lib/shared-demo-state'

export type LightPowerState = 'on' | 'off'

export const DEFAULT_LIGHT_POWER: LightPowerState = 'on'
export const DEFAULT_LIGHT_BRIGHTNESS = 100
export const DEFAULT_LIGHT_DESCRIPTION = '브론즈 대기 조명'
export const DEFAULT_LIGHT_COLOR = HUE_DEFAULT_STANDBY_COLOR

export const PREPARATION_MODE_TO_HUE_MODE: Record<PreparationMode, HueMode> = {
  condition: 'condition_balance',
  'sleep-rhythm': 'sleep_rhythm',
  refresh: 'mood_refresh',
  'rest-ready': 'rest_prepare',
  'couple-routine': 'couple_dinner',
}

export const ROUTINE_TO_HUE_MODE: Record<string, HueMode> = {
  nausea_food: 'nausea_food',
  sleep_care: 'sleep_care',
  housework_care: 'housework_care',
  destination_ocean: 'destination_ocean',
  destination_forest: 'destination_forest',
  destination_city: 'destination_city',
}

export const QUERY_MODE_TO_HUE_MODE: Record<string, HueMode> = {
  nausea: 'nausea_food',
  sleep: 'sleep_care',
  housework: 'housework_care',
  travel_ocean: 'destination_ocean',
  travel_forest: 'destination_forest',
  travel_city: 'destination_city',
}

export function resolveHueModeFromCareResult(result: {
  preparationMode?: string | null
  routineId?: string | null
  queryMode?: string | null
}): HueMode | null {
  if (result.preparationMode) {
    const preparationMode = PREPARATION_MODE_TO_HUE_MODE[result.preparationMode as PreparationMode]
    if (preparationMode) return preparationMode
  }

  if (result.routineId) {
    const routineMode = ROUTINE_TO_HUE_MODE[result.routineId]
    if (routineMode) return routineMode
  }

  if (result.queryMode) {
    const queryMode = QUERY_MODE_TO_HUE_MODE[result.queryMode]
    if (queryMode) return queryMode
  }

  return null
}

export function getLightColorForHueMode(mode: HueMode | null | undefined) {
  return mode ? getHueRepresentativeColor(mode) : DEFAULT_LIGHT_COLOR
}

export function getLightPowerAction(result: {
  lightPowerOff?: boolean
  lightPowerOn?: boolean
  lightAction?: LightPowerState | null
}) {
  return result.lightAction ?? (result.lightPowerOff ? 'off' : result.lightPowerOn ? 'on' : null)
}
