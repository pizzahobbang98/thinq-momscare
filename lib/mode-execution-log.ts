import type { SupabaseClient } from '@supabase/supabase-js'
import type { PreparationMode } from '@/lib/shared-demo-state'
import {
  hubModeToSimulationRoutine,
  isTravelDestination,
  type SimulationRoutineId,
  type TravelDestination,
} from '@/lib/simulation-routine-bridge'

export const MODE_EXECUTION_LOGS_TABLE = 'mode_execution_logs'

export type ModeExecutionMode =
  | 'nausea'
  | 'sleep'
  | 'housework'
  | 'ocean'
  | 'forest'
  | 'city'
  | 'condition_balance'
  | 'sleep_rhythm'
  | 'mood_refresh'
  | 'rest_ready'
  | 'couple_dinner'

export type ModeExecutionSource =
  | 'voice_wake'
  | 'mobile_hub'
  | 'manual_control'
  | 'simulation_3d'

export type ModeExecutionLogInput = {
  id?: string | null
  mode: string | null | undefined
  modeLabel?: string | null
  source?: string | null
  inputText?: string | null
  signals?: unknown
  routineId?: string | null
  travelDestination?: string | null
  preparationMode?: PreparationMode | null
}

type ModeExecutionMeta = {
  mode: ModeExecutionMode
  modeLabel: string
}

type ModeExecutionLogRow = {
  id?: string
  mode: ModeExecutionMode
  mode_label: string
  source: ModeExecutionSource
  input_text: string | null
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const PREPARATION_MODE_META: Record<PreparationMode, ModeExecutionMeta> = {
  condition: { mode: 'condition_balance', modeLabel: '컨디션밸런스' },
  'sleep-rhythm': { mode: 'sleep_rhythm', modeLabel: '수면리듬' },
  refresh: { mode: 'mood_refresh', modeLabel: '마음환기' },
  'rest-ready': { mode: 'rest_ready', modeLabel: '휴식준비' },
  'couple-routine': { mode: 'couple_dinner', modeLabel: '둘의 저녁' },
}

const ROUTINE_META: Record<SimulationRoutineId, ModeExecutionMeta> = {
  nausea_food: { mode: 'nausea', modeLabel: '입덧 케어' },
  sleep_care: { mode: 'sleep', modeLabel: '수면 케어' },
  housework_care: { mode: 'housework', modeLabel: '가사 도움' },
  destination_ocean: { mode: 'ocean', modeLabel: '바다 모드' },
  destination_forest: { mode: 'forest', modeLabel: '숲 모드' },
  destination_city: { mode: 'city', modeLabel: '도시 모드' },
}

const DIRECT_MODE_META: Record<string, ModeExecutionMeta> = {
  NAUSEA_MODE: ROUTINE_META.nausea_food,
  nausea: ROUTINE_META.nausea_food,
  nausea_food: ROUTINE_META.nausea_food,
  SLEEP_MODE: ROUTINE_META.sleep_care,
  sleep: ROUTINE_META.sleep_care,
  sleep_care: ROUTINE_META.sleep_care,
  HOUSEWORK_MODE: ROUTINE_META.housework_care,
  housework: ROUTINE_META.housework_care,
  housework_care: ROUTINE_META.housework_care,
  ocean: ROUTINE_META.destination_ocean,
  travel_ocean: ROUTINE_META.destination_ocean,
  destination_ocean: ROUTINE_META.destination_ocean,
  forest: ROUTINE_META.destination_forest,
  travel_forest: ROUTINE_META.destination_forest,
  destination_forest: ROUTINE_META.destination_forest,
  city: ROUTINE_META.destination_city,
  travel_city: ROUTINE_META.destination_city,
  destination_city: ROUTINE_META.destination_city,
  condition: PREPARATION_MODE_META.condition,
  condition_balance: PREPARATION_MODE_META.condition,
  'condition-balance': PREPARATION_MODE_META.condition,
  sleep_rhythm: PREPARATION_MODE_META['sleep-rhythm'],
  'sleep-rhythm': PREPARATION_MODE_META['sleep-rhythm'],
  refresh: PREPARATION_MODE_META.refresh,
  mood_refresh: PREPARATION_MODE_META.refresh,
  'mood-refresh': PREPARATION_MODE_META.refresh,
  rest_ready: PREPARATION_MODE_META['rest-ready'],
  'rest-ready': PREPARATION_MODE_META['rest-ready'],
  couple_dinner: PREPARATION_MODE_META['couple-routine'],
  'couple-dinner': PREPARATION_MODE_META['couple-routine'],
  'couple-routine': PREPARATION_MODE_META['couple-routine'],
}

function signalsToText(signals: unknown): string {
  if (Array.isArray(signals)) {
    return signals.filter((item): item is string => typeof item === 'string').join(' ')
  }

  if (signals && typeof signals === 'object') {
    return Object.values(signals)
      .filter((item): item is string => typeof item === 'string')
      .join(' ')
  }

  return ''
}

function normalizeRoutineId(value: string | null | undefined): SimulationRoutineId | null {
  return value && value in ROUTINE_META ? (value as SimulationRoutineId) : null
}

function normalizeTravelDestination(value: string | null | undefined): TravelDestination | null {
  return isTravelDestination(value) ? value : null
}

function metaFromPreparationText(text: string): ModeExecutionMeta | null {
  const normalized = text.replace(/\s+/g, '')

  if (normalized.includes('컨디션') && normalized.includes('밸런스')) {
    return PREPARATION_MODE_META.condition
  }
  if (normalized.includes('수면리듬')) return PREPARATION_MODE_META['sleep-rhythm']
  if (normalized.includes('마음환기')) return PREPARATION_MODE_META.refresh
  if (normalized.includes('휴식준비')) return PREPARATION_MODE_META['rest-ready']
  if (normalized.includes('둘의저녁')) return PREPARATION_MODE_META['couple-routine']

  return null
}

function metaFromTravelText(text: string): ModeExecutionMeta | null {
  if (/(숲|forest|나무|초록|자연)/i.test(text)) return ROUTINE_META.destination_forest
  if (/(도시|야경|city|호텔|라운지)/i.test(text)) return ROUTINE_META.destination_city
  if (/(바다|파도|ocean|해변|휴양지)/i.test(text)) return ROUTINE_META.destination_ocean

  return null
}

export function normalizeModeExecutionSource(source: string | null | undefined): ModeExecutionSource {
  const normalized = source?.trim().toLowerCase() ?? ''

  if (normalized.includes('simulation') || normalized.includes('3d')) return 'simulation_3d'
  if (normalized.includes('mobile')) return 'mobile_hub'
  if (normalized.includes('voice')) return 'voice_wake'

  return 'manual_control'
}

export function buildModeExecutionLogRow(input: ModeExecutionLogInput): ModeExecutionLogRow | null {
  const mode = input.mode?.trim() ?? ''
  if (!mode || mode === 'DEMO_STATE' || mode === 'UNKNOWN' || mode === 'MORNING_BRIEFING') {
    return null
  }

  const contextText = [
    input.modeLabel,
    input.inputText,
    signalsToText(input.signals),
  ]
    .filter((item): item is string => Boolean(item?.trim()))
    .join(' ')

  const preparationMeta = input.preparationMode
    ? PREPARATION_MODE_META[input.preparationMode]
    : metaFromPreparationText(contextText)
  const routineId =
    normalizeRoutineId(input.routineId) ??
    hubModeToSimulationRoutine(mode, {
      inputText: input.inputText ?? contextText,
      travelDestination: normalizeTravelDestination(input.travelDestination),
    })
  const meta =
    preparationMeta ??
    (routineId ? ROUTINE_META[routineId] : null) ??
    DIRECT_MODE_META[mode] ??
    DIRECT_MODE_META[mode.toUpperCase()] ??
    (mode === 'TRAVEL_MODE' ? metaFromTravelText(contextText) : null)

  if (!meta) return null

  return {
    ...(input.id && UUID_RE.test(input.id) ? { id: input.id } : {}),
    mode: meta.mode,
    mode_label: meta.modeLabel,
    source: normalizeModeExecutionSource(input.source),
    input_text: input.inputText?.trim() || null,
  }
}

export async function saveModeExecutionLog(
  supabase: SupabaseClient,
  input: ModeExecutionLogInput,
): Promise<void> {
  const row = buildModeExecutionLogRow(input)
  if (!row) return

  try {
    const { error } = await supabase
      .from(MODE_EXECUTION_LOGS_TABLE)
      .upsert(row, { onConflict: 'id' })

    if (error) {
      console.warn('[mode-execution-log] save skipped:', error.message)
    }
  } catch (error) {
    console.warn('[mode-execution-log] save failed:', error)
  }
}
