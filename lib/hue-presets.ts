export const HUE_EFFECT_BRIGHTNESS = 100
export const HUE_EFFECT_STEP_MS = 2000
export const HUE_DEFAULT_STANDBY_COLOR = '#7A4A00'

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

type HuePalette = readonly [string, string, string, string, string, string]

export type HuePreset = {
  mode: HueMode
  label: string
  baseHex: string
  palette: HuePalette
  brightness: 100
  effectSteps: number
  effectStepMs: number
}

function defineHuePreset(mode: HueMode, label: string, palette: HuePalette): HuePreset {
  return {
    mode,
    label,
    baseHex: palette[0],
    palette,
    brightness: HUE_EFFECT_BRIGHTNESS,
    effectSteps: palette.length,
    effectStepMs: HUE_EFFECT_STEP_MS,
  }
}

export const HUE_MODE_PRESETS: Record<HueMode, HuePreset> = {
  nausea_food: defineHuePreset('nausea_food', 'Nausea care', ['#00B8FF', '#22C4FF', '#4DD0FF', '#78DBFF', '#A8E9FF', '#D7F6FF']),
  sleep_care: defineHuePreset('sleep_care', 'Sleep care', ['#5B1FFF', '#6F3AFF', '#8557FF', '#9C78FF', '#BBA5FF', '#DDD2FF']),
  housework_care: defineHuePreset('housework_care', 'Housework care', ['#A6FF00', '#B8FF2E', '#C9FF5C', '#D8FF87', '#E6FFB3', '#F3FFD9']),
  destination_ocean: defineHuePreset('destination_ocean', 'Ocean resort', ['#00C2A8', '#24CCB6', '#4BD8C5', '#79E4D6', '#A9F0E7', '#D9FBF7']),
  destination_forest: defineHuePreset('destination_forest', 'Forest resort', ['#007A2A', '#1E9142', '#46A864', '#73C188', '#A4DAB2', '#D6F0DA']),
  destination_city: defineHuePreset('destination_city', 'City resort', ['#A100FF', '#AE26FF', '#BD52FF', '#CE7DFF', '#DFAAFF', '#F0D6FF']),
  condition_balance: defineHuePreset('condition_balance', 'Condition balance', ['#FF8A00', '#FFA126', '#FFB84D', '#FFCC73', '#FFE0A3', '#FFF0CC']),
  sleep_rhythm: defineHuePreset('sleep_rhythm', 'Sleep rhythm', ['#003CFF', '#2F62FF', '#5A82FF', '#82A1FF', '#ADC2FF', '#D8E2FF']),
  mood_refresh: defineHuePreset('mood_refresh', 'Mood refresh', ['#FFCC00', '#FFD52E', '#FFDE5C', '#FFE789', '#FFF0B5', '#FFF9E0']),
  rest_prepare: defineHuePreset('rest_prepare', 'Rest prepare', ['#FF4E42', '#FF6A5F', '#FF887D', '#FFA69C', '#FFC5BE', '#FFE4E0']),
  couple_dinner: defineHuePreset('couple_dinner', 'Couple dinner', ['#C4004B', '#D22B66', '#DE5781', '#E9829D', '#F2ADBA', '#F9D8DF']),
}

const HUE_MODE_SET = new Set<string>(Object.keys(HUE_MODE_PRESETS))

export function isHueMode(value: unknown): value is HueMode {
  return typeof value === 'string' && HUE_MODE_SET.has(value)
}

export function getHuePreset(mode: HueMode) {
  return HUE_MODE_PRESETS[mode]
}

export function getHueRepresentativeColor(mode: HueMode) {
  return HUE_MODE_PRESETS[mode].baseHex
}

export function isHueSolidMode(mode: HueMode) {
  return isHueMode(mode)
}

export function getHuePlaybackPalette(mode: HueMode) {
  const preset = HUE_MODE_PRESETS[mode]
  return [preset.baseHex]
}
