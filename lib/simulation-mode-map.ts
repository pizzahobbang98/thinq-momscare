export type SimulationQueryMode =
  | 'default'
  | 'nausea'
  | 'sleep'
  | 'resort'
  | 'travel_ocean'
  | 'travel_forest'
  | 'travel_city'
  | 'housework'
  | 'morning'

export type ThinQMomHubMode =
  | 'NAUSEA_MODE'
  | 'SLEEP_MODE'
  | 'TRAVEL_MODE'
  | 'HOUSEWORK_MODE'
  | 'MORNING_BRIEFING'

/** 허브 내부 모드 → 3D 시뮬레이션 query parameter */
export const HUB_MODE_TO_SIMULATION_QUERY: Record<string, SimulationQueryMode> = {
  NAUSEA_MODE: 'nausea',
  SLEEP_MODE: 'sleep',
  TRAVEL_MODE: 'resort',
  HOUSEWORK_MODE: 'housework',
  MORNING_BRIEFING: 'morning',
}

/** query parameter → 허브 내부 모드 */
export const SIMULATION_QUERY_TO_HUB_MODE: Record<SimulationQueryMode, ThinQMomHubMode | null> = {
  default: null,
  nausea: 'NAUSEA_MODE',
  sleep: 'SLEEP_MODE',
  resort: 'TRAVEL_MODE',
  travel_ocean: 'TRAVEL_MODE',
  travel_forest: 'TRAVEL_MODE',
  travel_city: 'TRAVEL_MODE',
  housework: 'HOUSEWORK_MODE',
  morning: 'MORNING_BRIEFING',
}

export const SIMULATION_QUERY_MODE_LABELS: Record<SimulationQueryMode, string> = {
  default: '대기 중',
  nausea: '입덧모드',
  sleep: '수면모드',
  resort: '휴양지모드',
  travel_ocean: '휴양지모드 (바다)',
  travel_forest: '휴양지모드 (숲)',
  travel_city: '휴양지모드 (도시)',
  housework: '가사케어 모드',
  morning: '굿모닝 브리핑',
}

const QUERY_ALIASES: Record<string, SimulationQueryMode> = {
  default: 'default',
  nausea: 'nausea',
  sleep: 'sleep',
  resort: 'resort',
  travel: 'resort',
  travel_ocean: 'travel_ocean',
  travel_forest: 'travel_forest',
  travel_city: 'travel_city',
  housework: 'housework',
  homecare: 'housework',
  morning: 'morning',
  briefing: 'morning',
  NAUSEA_MODE: 'nausea',
  SLEEP_MODE: 'sleep',
  TRAVEL_MODE: 'resort',
  HOUSEWORK_MODE: 'housework',
  MORNING_BRIEFING: 'morning',
}

export function normalizeSimulationQueryMode(value: string | null | undefined): SimulationQueryMode {
  if (!value) return 'default'
  const trimmed = value.trim()
  return QUERY_ALIASES[trimmed] ?? QUERY_ALIASES[trimmed.toUpperCase()] ?? 'default'
}

export function hubModeToSimulationQuery(mode: string | null | undefined): SimulationQueryMode {
  if (!mode) return 'default'
  return HUB_MODE_TO_SIMULATION_QUERY[mode] ?? normalizeSimulationQueryMode(mode)
}

export function simulationRoutineToQueryMode(
  routineId: string | null | undefined,
): SimulationQueryMode {
  switch (routineId) {
    case 'nausea_food':
      return 'nausea'
    case 'sleep_care':
      return 'sleep'
    case 'housework_care':
      return 'housework'
    case 'destination_ocean':
      return 'travel_ocean'
    case 'destination_forest':
      return 'travel_forest'
    case 'destination_city':
      return 'travel_city'
    default:
      return 'default'
  }
}

export function simulationQueryToHubMode(queryMode: SimulationQueryMode): ThinQMomHubMode | null {
  return SIMULATION_QUERY_TO_HUB_MODE[queryMode] ?? null
}

export const SIMULATION_3D_PATH = '/simulation-3d/index.html'
