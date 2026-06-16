import {
  hubModeToSimulationQuery,
  simulationRoutineToQueryMode,
  SIMULATION_3D_PATH,
} from '@/lib/simulation-mode-map'

/**
 * 3D React 앱(`assets/dashboard-CL4rWHcW.js`) Jz allowlist와 XE routine 키.
 * 번들 내부 voice-agent-routine 이벤트가 이 ID만 수신합니다.
 */
export const SIMULATION_3D_ROUTINE_IDS = [
  'nausea_food',
  'sleep_care',
  'housework_care',
  'destination_forest',
  'destination_ocean',
  'destination_city',
] as const

export type SimulationRoutineId = (typeof SIMULATION_3D_ROUTINE_IDS)[number]

export type TravelDestination = 'ocean' | 'forest' | 'city'

/** 허브 케어 모드 → 3D React routine ID (TRAVEL_MODE 제외) */
export const HUB_TO_3D_ROUTINE_MAP: Record<string, SimulationRoutineId> = {
  NAUSEA_MODE: 'nausea_food',
  SLEEP_MODE: 'sleep_care',
  HOUSEWORK_MODE: 'housework_care',
  nausea: 'nausea_food',
  sleep: 'sleep_care',
  housework: 'housework_care',
  homecare: 'housework_care',
  nausea_food: 'nausea_food',
  sleep_care: 'sleep_care',
  housework_care: 'housework_care',
  destination_forest: 'destination_forest',
  destination_ocean: 'destination_ocean',
  destination_city: 'destination_city',
  forest: 'destination_forest',
  ocean: 'destination_ocean',
  city: 'destination_city',
}

/** 휴양지 세부 목적지 → 3D React routine ID */
export const TRAVEL_DESTINATION_TO_3D_ROUTINE_MAP: Record<TravelDestination, SimulationRoutineId> = {
  ocean: 'destination_ocean',
  forest: 'destination_forest',
  city: 'destination_city',
}

export const TRAVEL_DESTINATION_LABELS: Record<TravelDestination, string> = {
  ocean: '바다',
  forest: '숲',
  city: '도시',
}

const ROUTINE_ID_SET = new Set<string>(SIMULATION_3D_ROUTINE_IDS)

export function isSimulationRoutineId(value: string): value is SimulationRoutineId {
  return ROUTINE_ID_SET.has(value)
}

export function isTravelDestination(value: string | null | undefined): value is TravelDestination {
  return value === 'ocean' || value === 'forest' || value === 'city'
}

export function detectTravelDestinationFromText(text: string): TravelDestination | null {
  const normalized = text.trim()
  if (!normalized) return null

  if (/(숲|forest|나무|새소리|자연\s*속|숲속)/i.test(normalized)) return 'forest'
  if (/(도시|야경|호텔|라운지|도심|city)/i.test(normalized)) return 'city'
  if (/(바다|파도|해변|바닷가|ocean|해안)/i.test(normalized)) return 'ocean'

  return null
}

export function resolveTravelDestination(
  explicit?: TravelDestination | null,
  inputText?: string,
): TravelDestination | null {
  if (explicit && isTravelDestination(explicit)) return explicit
  if (inputText) return detectTravelDestinationFromText(inputText)
  return null
}

export function getTravelModeDisplayLabel(
  baseLabel: string,
  destination: TravelDestination | null,
): string {
  if (!destination) return baseLabel
  return `${baseLabel} · ${TRAVEL_DESTINATION_LABELS[destination]}`
}

export type HubToSimulationRoutineOptions = {
  travelDestination?: TravelDestination | null
  inputText?: string
  routineId?: SimulationRoutineId | null
  pregnancyStatus?: string | null
  pregnancyWeek?: number | null
}

function isTravelHubMode(mode: string | null | undefined): boolean {
  if (!mode) return false
  const trimmed = mode.trim()
  const upper = trimmed.toUpperCase()
  return (
    upper === 'TRAVEL_MODE' ||
    trimmed === 'resort' ||
    trimmed === 'travel' ||
    trimmed.startsWith('destination_')
  )
}

export function hubModeToSimulationRoutine(
  mode: string | null | undefined,
  options: HubToSimulationRoutineOptions = {},
): SimulationRoutineId | null {
  if (options.routineId && isSimulationRoutineId(options.routineId)) {
    return options.routineId
  }

  if (!mode) return null

  const trimmed = mode.trim()

  if (isTravelHubMode(trimmed)) {
    const destination = resolveTravelDestination(options.travelDestination, options.inputText) ?? 'ocean'
    return TRAVEL_DESTINATION_TO_3D_ROUTINE_MAP[destination]
  }

  const direct = HUB_TO_3D_ROUTINE_MAP[trimmed] ?? HUB_TO_3D_ROUTINE_MAP[trimmed.toUpperCase()]
  if (direct) return direct

  const queryMode = hubModeToSimulationQuery(trimmed)
  if (queryMode === 'resort') {
    const destination = resolveTravelDestination(options.travelDestination, options.inputText) ?? 'ocean'
    return TRAVEL_DESTINATION_TO_3D_ROUTINE_MAP[destination]
  }

  if (queryMode !== 'default') {
    return HUB_TO_3D_ROUTINE_MAP[queryMode] ?? null
  }

  return null
}

export function travelDestinationFromRoutineId(
  routineId: SimulationRoutineId | null | undefined,
): TravelDestination | null {
  if (routineId === 'destination_ocean') return 'ocean'
  if (routineId === 'destination_forest') return 'forest'
  if (routineId === 'destination_city') return 'city'
  return null
}

export function buildSimulation3dUrl(
  hubMode?: string | null,
  options: HubToSimulationRoutineOptions = {},
): string {
  const routineId =
    options.routineId && isSimulationRoutineId(options.routineId)
      ? options.routineId
      : hubModeToSimulationRoutine(hubMode, options)

  const params = new URLSearchParams()

  if (routineId) params.set('routine', routineId)

  const queryMode =
    routineId && simulationRoutineToQueryMode(routineId) !== 'default'
      ? simulationRoutineToQueryMode(routineId)
      : hubModeToSimulationQuery(hubMode)

  const isPregnancyPrep =
    !routineId &&
    queryMode === 'default' &&
    (options.pregnancyStatus === 'preparing' ||
      (options.pregnancyStatus === 'pregnant' &&
        typeof options.pregnancyWeek === 'number' &&
        options.pregnancyWeek > 0 &&
        options.pregnancyWeek <= 13))

  if (isPregnancyPrep) {
    params.set('mode', 'pregnancy-prep')
  } else if (queryMode !== 'default') {
    params.set('mode', queryMode)
  }

  if (options.pregnancyStatus) params.set('status', options.pregnancyStatus)
  if (typeof options.pregnancyWeek === 'number') {
    params.set('weeks', String(options.pregnancyWeek))
  }

  const destination =
    resolveTravelDestination(options.travelDestination, options.inputText) ??
    travelDestinationFromRoutineId(routineId)

  if (destination) params.set('destination', destination)

  const query = params.toString()
  return query ? `${SIMULATION_3D_PATH}?${query}` : SIMULATION_3D_PATH
}
