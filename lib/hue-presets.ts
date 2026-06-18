export const HUE_EFFECT_BRIGHTNESS = 100
export const HUE_EFFECT_STEPS = 10

export type HueMode =
  | 'nausea_food'
  | 'sleep_care'
  | 'housework_care'
  | 'destination_ocean'
  | 'destination_forest'
  | 'destination_city'
  | 'condition_balance'
  | 'sleep_rhythm'
  | 'mood_refresh'
  | 'rest_prepare'
  | 'couple_dinner'

export type HuePreset = {
  mode: HueMode
  label: string
  baseHex: string
  brightness: 100
  effectSteps: 10
  effectStepMs: number
}

export const HUE_MODE_PRESETS: Record<HueMode, HuePreset> = {
  nausea_food: {
    mode: 'nausea_food',
    label: 'Nausea care',
    baseHex: '#E3F8FF',
    brightness: HUE_EFFECT_BRIGHTNESS,
    effectSteps: HUE_EFFECT_STEPS,
    effectStepMs: 550,
  },
  sleep_care: {
    mode: 'sleep_care',
    label: 'Sleep care',
    baseHex: '#FFD8B8',
    brightness: HUE_EFFECT_BRIGHTNESS,
    effectSteps: HUE_EFFECT_STEPS,
    effectStepMs: 700,
  },
  housework_care: {
    mode: 'housework_care',
    label: 'Housework care',
    baseHex: '#FFF4E6',
    brightness: HUE_EFFECT_BRIGHTNESS,
    effectSteps: HUE_EFFECT_STEPS,
    effectStepMs: 550,
  },
  destination_ocean: {
    mode: 'destination_ocean',
    label: 'Ocean resort',
    baseHex: '#E3F4FF',
    brightness: HUE_EFFECT_BRIGHTNESS,
    effectSteps: HUE_EFFECT_STEPS,
    effectStepMs: 600,
  },
  destination_forest: {
    mode: 'destination_forest',
    label: 'Forest resort',
    baseHex: '#E8F4DF',
    brightness: HUE_EFFECT_BRIGHTNESS,
    effectSteps: HUE_EFFECT_STEPS,
    effectStepMs: 650,
  },
  destination_city: {
    mode: 'destination_city',
    label: 'City resort',
    baseHex: '#7B61FF',
    brightness: HUE_EFFECT_BRIGHTNESS,
    effectSteps: HUE_EFFECT_STEPS,
    effectStepMs: 650,
  },
  condition_balance: {
    mode: 'condition_balance',
    label: 'Condition balance',
    baseHex: '#E8D7A3',
    brightness: HUE_EFFECT_BRIGHTNESS,
    effectSteps: HUE_EFFECT_STEPS,
    effectStepMs: 600,
  },
  sleep_rhythm: {
    mode: 'sleep_rhythm',
    label: 'Sleep rhythm',
    baseHex: '#6D7BE0',
    brightness: HUE_EFFECT_BRIGHTNESS,
    effectSteps: HUE_EFFECT_STEPS,
    effectStepMs: 700,
  },
  mood_refresh: {
    mode: 'mood_refresh',
    label: 'Mood refresh',
    baseHex: '#C4B6FF',
    brightness: HUE_EFFECT_BRIGHTNESS,
    effectSteps: HUE_EFFECT_STEPS,
    effectStepMs: 650,
  },
  rest_prepare: {
    mode: 'rest_prepare',
    label: 'Rest prepare',
    baseHex: '#FFC887',
    brightness: HUE_EFFECT_BRIGHTNESS,
    effectSteps: HUE_EFFECT_STEPS,
    effectStepMs: 700,
  },
  couple_dinner: {
    mode: 'couple_dinner',
    label: 'Couple dinner',
    baseHex: '#E8A0A8',
    brightness: HUE_EFFECT_BRIGHTNESS,
    effectSteps: HUE_EFFECT_STEPS,
    effectStepMs: 650,
  },
}

const HUE_MODE_SET = new Set<string>(Object.keys(HUE_MODE_PRESETS))

export function isHueMode(value: unknown): value is HueMode {
  return typeof value === 'string' && HUE_MODE_SET.has(value)
}

export function getHuePreset(mode: HueMode) {
  return HUE_MODE_PRESETS[mode]
}
