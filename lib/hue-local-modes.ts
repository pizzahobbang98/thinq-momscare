import {
  HUE_DEFAULT_STANDBY_COLOR,
  HUE_EFFECT_BRIGHTNESS,
  getHueRepresentativeColor,
} from '@/lib/hue-presets'

export type HueLocalMode =
  | 'default'
  | 'nausea-care'
  | 'sleep-care'
  | 'chores-care'
  | 'vacation-ocean'
  | 'vacation-forest'
  | 'vacation-city'
  | 'condition-balance'
  | 'sleep-rhythm'
  | 'mood-refresh'
  | 'rest-prepare'
  | 'couple-dinner'

const HUE_LOCAL_MODES = new Set<string>([
  'default',
  'nausea-care',
  'sleep-care',
  'chores-care',
  'vacation-ocean',
  'vacation-forest',
  'vacation-city',
  'condition-balance',
  'sleep-rhythm',
  'mood-refresh',
  'rest-prepare',
  'couple-dinner',
])

const HUE_LOCAL_MODE_ALIASES: Record<string, HueLocalMode> = {
  default: 'default',
  idle: 'default',
  base: 'default',
  standby: 'default',
  'nausea-care': 'nausea-care',
  'nausea-food': 'nausea-care',
  'nausea-mode': 'nausea-care',
  nausea: 'nausea-care',
  'sleep-care': 'sleep-care',
  'sleep-mode': 'sleep-care',
  sleep: 'sleep-care',
  'chores-care': 'chores-care',
  'housework-care': 'chores-care',
  'housework-mode': 'chores-care',
  housework: 'chores-care',
  homecare: 'chores-care',
  'vacation-mode': 'vacation-ocean',
  'travel-mode': 'vacation-ocean',
  resort: 'vacation-ocean',
  travel: 'vacation-ocean',
  'travel-ocean': 'vacation-ocean',
  'destination-ocean': 'vacation-ocean',
  'vacation-ocean': 'vacation-ocean',
  ocean: 'vacation-ocean',
  'travel-forest': 'vacation-forest',
  'destination-forest': 'vacation-forest',
  'vacation-forest': 'vacation-forest',
  forest: 'vacation-forest',
  'travel-city': 'vacation-city',
  'destination-city': 'vacation-city',
  'vacation-city': 'vacation-city',
  city: 'vacation-city',
  condition: 'condition-balance',
  'condition-balance': 'condition-balance',
  'sleep-rhythm': 'sleep-rhythm',
  refresh: 'mood-refresh',
  'mood-refresh': 'mood-refresh',
  'rest-ready': 'rest-prepare',
  'rest-prepare': 'rest-prepare',
  'couple-routine': 'couple-dinner',
  'couple-dinner': 'couple-dinner',
}

const HUE_LOCAL_NO_OP_KEYS = new Set([
  '',
  'none',
  'null',
  'undefined',
  'air-on',
  'air-off',
  'morning',
  'morning-briefing',
])

export function getHueLocalModeLookupKey(value: unknown) {
  return typeof value === 'string'
    ? value.trim().replace(/_/g, '-').toLowerCase()
    : ''
}

export function normalizeHueLocalMode(value: unknown): HueLocalMode | null {
  const key = getHueLocalModeLookupKey(value)
  if (HUE_LOCAL_NO_OP_KEYS.has(key)) return null
  return HUE_LOCAL_MODE_ALIASES[key] ?? (HUE_LOCAL_MODES.has(key) ? key as HueLocalMode : null)
}

export function getHueLocalFallbackPath(mode: HueLocalMode) {
  switch (mode) {
    case 'default':
      return '/api/v1/light/mode'
    case 'nausea-care':
      return '/api/v1/light/nausea-care'
    case 'sleep-care':
      return '/api/v1/light/sleep-care'
    case 'chores-care':
      return '/api/v1/light/chores-care'
    case 'vacation-ocean':
    case 'vacation-forest':
    case 'vacation-city':
      return '/api/v1/light/vacation-mode'
    default:
      return `/api/v1/light/${mode}`
  }
}

export function getHueLocalRepresentativeColor(mode: HueLocalMode) {
  switch (mode) {
    case 'default':
      return HUE_DEFAULT_STANDBY_COLOR
    case 'nausea-care':
      return getHueRepresentativeColor('nausea_food')
    case 'sleep-care':
      return getHueRepresentativeColor('sleep_care')
    case 'chores-care':
      return getHueRepresentativeColor('housework_care')
    case 'vacation-ocean':
      return getHueRepresentativeColor('destination_ocean')
    case 'vacation-forest':
      return getHueRepresentativeColor('destination_forest')
    case 'vacation-city':
      return getHueRepresentativeColor('destination_city')
    case 'condition-balance':
      return getHueRepresentativeColor('condition_balance')
    case 'sleep-rhythm':
      return getHueRepresentativeColor('sleep_rhythm')
    case 'mood-refresh':
      return getHueRepresentativeColor('mood_refresh')
    case 'rest-prepare':
      return getHueRepresentativeColor('rest_prepare')
    case 'couple-dinner':
      return getHueRepresentativeColor('couple_dinner')
  }
}

export const HUE_LOCAL_REPRESENTATIVE_BRIGHTNESS = HUE_EFFECT_BRIGHTNESS
