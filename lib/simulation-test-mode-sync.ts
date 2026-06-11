import { getSimulationScene } from '@/lib/demo-simulation'
import type { DeviceAction } from '@/lib/mode-actions'
import {
  getTravelModeDisplayLabel,
  travelDestinationFromRoutineId,
  type SimulationRoutineId,
  type TravelDestination,
} from '@/lib/simulation-routine-bridge'

export const SIMULATION_TEST_MODE_STORAGE_KEY = 'thinq_simulation_mode'
export const SIMULATION_ROUTINE_STORAGE_KEY = 'thinq_simulation_routine'
export const SIMULATION_DESTINATION_STORAGE_KEY = 'thinq_simulation_destination'
export const SIMULATION_TEST_MODE_CHANGE_EVENT = 'thinq-simulation-mode-change'

export type SimulationTestModeSlug =
  | 'nausea'
  | 'morning_sickness'
  | 'sleep'
  | 'resort'
  | 'travel_ocean'
  | 'forest'
  | 'travel_forest'
  | 'city'
  | 'travel_city'
  | 'housework'

export type SimulationTestModeSource = 'test-tab' | 'hub-execute' | 'url-query'

export type SimulationTestModeSnapshot = {
  slug: SimulationTestModeSlug
  hubMode: 'NAUSEA_MODE' | 'SLEEP_MODE' | 'TRAVEL_MODE' | 'HOUSEWORK_MODE'
  routineId: SimulationRoutineId
  travelDestination?: TravelDestination | null
  modeLabel: string
  reason: string
  reply: string
  wifeCard: string
  husbandCard: string
  signals: string[]
  simulationScene: string | null
  simulationText: string | null
  source: SimulationTestModeSource
  timestamp: number
}

export type HubExecutionResultLike = {
  mode: string
  modeLabel: string
  signals: string[]
  reason?: string
  reply: string
  wifeCard: string
  husbandCard: string
  deviceResults: DeviceAction[]
  simulationScene?: string | null
  simulationText?: string | null
  demoUpdatedAt?: string | null
}

const ROUTINE_TO_SLUG: Record<SimulationRoutineId, SimulationTestModeSlug> = {
  nausea_food: 'morning_sickness',
  sleep_care: 'sleep',
  housework_care: 'housework',
  destination_ocean: 'travel_ocean',
  destination_forest: 'travel_forest',
  destination_city: 'travel_city',
}

const SLUG_ALIASES: Record<string, SimulationTestModeSlug> = {
  nausea: 'morning_sickness',
  morning_sickness: 'morning_sickness',
  sleep: 'sleep',
  resort: 'travel_ocean',
  travel_ocean: 'travel_ocean',
  ocean: 'travel_ocean',
  forest: 'travel_forest',
  travel_forest: 'travel_forest',
  city: 'travel_city',
  travel_city: 'travel_city',
  housework: 'housework',
  homecare: 'housework',
}

const MODE_CONTENT: Record<
  SimulationRoutineId,
  Omit<
    SimulationTestModeSnapshot,
    'slug' | 'hubMode' | 'routineId' | 'travelDestination' | 'source' | 'timestamp'
  >
> = {
  nausea_food: {
    modeLabel: '입덧모드',
    reason: '입덧, 냄새, 구역감과 관련된 표현이 감지됐어요.',
    reply: '냄새 부담이 줄어들도록 공기청정기를 터보 모드로 바꿔드릴게요.',
    wifeCard: '입덧 부담을 줄이기 위해 공기청정기 터보 모드를 준비했어요.',
    husbandCard: '오늘은 냄새가 적은 음식과 조용한 주방 환경을 도와주세요.',
    signals: ['입덧', '냄새 민감', '공기 정화'],
    simulationScene: 'NAUSEA_SCENE',
    simulationText: '주방 냄새와 식사 부담을 줄이는 환경으로 전환됩니다.',
  },
  sleep_care: {
    modeLabel: '수면모드',
    reason: '수면, 피로, 휴식과 관련된 표현이 감지됐어요.',
    reply: '편하게 쉴 수 있도록 수면 환경을 차분하게 맞춰드릴게요.',
    wifeCard: '잠들기 좋은 침실 환경으로 공기청정기 수면 모드를 준비했어요.',
    husbandCard: '오늘은 소리와 조명을 낮추고 편히 쉬게 도와주세요.',
    signals: ['수면', '피로', '휴식'],
    simulationScene: 'SLEEP_SCENE',
    simulationText: '조명, 공기, 소음을 낮춘 침실 환경으로 전환됩니다.',
  },
  housework_care: {
    modeLabel: '가사케어 모드',
    reason: '집안일, 몸의 무거움, 움직이기 어려움과 관련된 표현이 감지됐어요.',
    reply: '지금 바로 움직이지 않아도 되도록 집안일 타이밍을 조정해볼게요.',
    wifeCard: '무리하지 않도록 집안일 케어 루틴을 준비했어요.',
    husbandCard: '빨래와 청소처럼 몸을 많이 쓰는 일을 먼저 확인해 주세요.',
    signals: ['집안일', '가사', '무리 줄이기'],
    simulationScene: null,
    simulationText: null,
  },
  destination_ocean: {
    modeLabel: '휴양지모드 · 바다',
    reason: '바다, 휴양, 기분 전환과 관련된 표현이 감지됐어요.',
    reply:
      '오늘의 목적지를 바다로 바꿔볼게요. 화면, 빛, 공기를 함께 맞춥니다.',
    wifeCard: '바닷가 휴양지처럼 시원하고 여유로운 공간 분위기를 준비했어요.',
    husbandCard: '함께 쉬자는 메시지와 편안한 휴식 시간을 준비해 주세요.',
    signals: ['휴양지', '바다', '기분 전환'],
    simulationScene: 'RESORT_SCENE',
    simulationText: '바닷가 휴양지처럼 시원하고 여유로운 공간 분위기를 연출합니다.',
  },
  destination_forest: {
    modeLabel: '휴양지모드 · 숲',
    reason: '숲, 자연, 고요한 휴식과 관련된 표현이 감지됐어요.',
    reply:
      '오늘의 목적지를 숲으로 바꿔볼게요. 화면, 빛, 공기를 함께 맞춥니다.',
    wifeCard: '숲속 휴양지처럼 고요하고 편안한 자연 분위기를 준비했어요.',
    husbandCard: '조용히 쉴 수 있도록 주변 소음을 줄여 주세요.',
    signals: ['휴양지', '숲', '자연'],
    simulationScene: 'RESORT_SCENE',
    simulationText: '숲속 휴양지처럼 고요하고 편안한 자연 분위기를 연출합니다.',
  },
  destination_city: {
    modeLabel: '휴양지모드 · 도시',
    reason: '도시, 야경, 차분한 휴식과 관련된 표현이 감지됐어요.',
    reply:
      '오늘의 목적지를 도시로 바꿔볼게요. 화면, 빛, 공기를 함께 맞춥니다.',
    wifeCard: '도시 휴양지처럼 세련되고 차분한 도심 라운지 분위기를 준비했어요.',
    husbandCard: '편안히 쉴 수 있도록 조명과 소음을 부드럽게 맞춰 주세요.',
    signals: ['휴양지', '도시', '라운지'],
    simulationScene: 'RESORT_SCENE',
    simulationText: '도시 휴양지처럼 세련되고 차분한 도심 라운지 분위기를 연출합니다.',
  },
}

function isDevEnvironment() {
  return process.env.NODE_ENV === 'development'
}

function devLog(message: string, payload?: unknown) {
  if (!isDevEnvironment()) return
  if (payload === undefined) {
    console.log(message)
    return
  }
  console.log(message, payload)
}

export function normalizeSimulationTestModeSlug(
  value: string | null | undefined,
): SimulationTestModeSlug | null {
  if (!value) return null
  const trimmed = value.trim().toLowerCase()
  return SLUG_ALIASES[trimmed] ?? null
}

export function routineIdToSimulationTestModeSlug(
  routineId: string | null | undefined,
): SimulationTestModeSlug | null {
  if (!routineId) return null
  return ROUTINE_TO_SLUG[routineId as SimulationRoutineId] ?? null
}

export function buildSimulationTestModeSnapshot(
  routineId: SimulationRoutineId,
  source: SimulationTestModeSource,
): SimulationTestModeSnapshot {
  const content = MODE_CONTENT[routineId]
  const travelDestination = travelDestinationFromRoutineId(routineId)
  const hubMode =
    routineId === 'nausea_food'
      ? 'NAUSEA_MODE'
      : routineId === 'sleep_care'
        ? 'SLEEP_MODE'
        : routineId === 'housework_care'
          ? 'HOUSEWORK_MODE'
          : 'TRAVEL_MODE'

  const sceneInfo = getSimulationScene(hubMode)
  const modeLabel =
    hubMode === 'TRAVEL_MODE' && travelDestination
      ? getTravelModeDisplayLabel('휴양지모드', travelDestination)
      : content.modeLabel

  return {
    slug: ROUTINE_TO_SLUG[routineId],
    hubMode,
    routineId,
    travelDestination,
    modeLabel,
    reason: content.reason,
    reply: content.reply,
    wifeCard: content.wifeCard,
    husbandCard: content.husbandCard,
    signals: content.signals,
    simulationScene: content.simulationScene ?? sceneInfo.simulationScene,
    simulationText: content.simulationText ?? sceneInfo.simulationText,
    source,
    timestamp: Date.now(),
  }
}

export function saveSimulationTestMode(snapshot: SimulationTestModeSnapshot) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(SIMULATION_TEST_MODE_STORAGE_KEY, JSON.stringify(snapshot))
  window.localStorage.setItem(SIMULATION_ROUTINE_STORAGE_KEY, snapshot.routineId)
  window.localStorage.setItem(
    SIMULATION_DESTINATION_STORAGE_KEY,
    snapshot.travelDestination ?? '',
  )
  window.dispatchEvent(
    new CustomEvent(SIMULATION_TEST_MODE_CHANGE_EVENT, {
      detail: snapshot,
    }),
  )

  devLog('[simulation-test-mode] saved', {
    slug: snapshot.slug,
    hubMode: snapshot.hubMode,
    routineId: snapshot.routineId,
    travelDestination: snapshot.travelDestination ?? null,
    source: snapshot.source,
    timestamp: snapshot.timestamp,
  })
}

export function saveSimulationTestModeFromRoutine(
  routineId: SimulationRoutineId,
  source: SimulationTestModeSource,
  options: { slug?: SimulationTestModeSlug } = {},
) {
  const snapshot = buildSimulationTestModeSnapshot(routineId, source)
  if (options.slug) {
    snapshot.slug = options.slug
  }
  saveSimulationTestMode(snapshot)
}

export function readSimulationTestMode(): SimulationTestModeSnapshot | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(SIMULATION_TEST_MODE_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<SimulationTestModeSnapshot>
    if (!parsed.routineId || !parsed.hubMode || !parsed.modeLabel) return null

    return {
      slug:
        parsed.slug ??
        routineIdToSimulationTestModeSlug(parsed.routineId) ??
        'morning_sickness',
      hubMode: parsed.hubMode,
      routineId: parsed.routineId as SimulationRoutineId,
      travelDestination: parsed.travelDestination ?? null,
      modeLabel: parsed.modeLabel,
      reason: parsed.reason ?? '',
      reply: parsed.reply ?? '',
      wifeCard: parsed.wifeCard ?? '',
      husbandCard: parsed.husbandCard ?? '',
      signals: Array.isArray(parsed.signals) ? parsed.signals : [],
      simulationScene: parsed.simulationScene ?? null,
      simulationText: parsed.simulationText ?? null,
      source: parsed.source ?? 'test-tab',
      timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : 0,
    }
  } catch (error) {
    devLog('[simulation-test-mode] read failed', error)
    return null
  }
}

export function simulationTestModeToHubExecutionResult(
  snapshot: SimulationTestModeSnapshot,
): HubExecutionResultLike {
  return {
    mode: snapshot.hubMode,
    modeLabel: snapshot.modeLabel,
    signals: snapshot.signals,
    reason: snapshot.reason,
    reply: snapshot.reply,
    wifeCard: snapshot.wifeCard,
    husbandCard: snapshot.husbandCard,
    deviceResults: [],
    simulationScene: snapshot.simulationScene,
    simulationText: snapshot.simulationText,
    demoUpdatedAt: new Date(snapshot.timestamp).toISOString(),
  }
}

export function shouldPreferSimulationTestMode(
  snapshot: SimulationTestModeSnapshot | null,
  lastHubExecutionTimestamp: number,
) {
  if (!snapshot) return false
  if (snapshot.source === 'test-tab') {
    return !lastHubExecutionTimestamp || snapshot.timestamp >= lastHubExecutionTimestamp
  }
  return snapshot.timestamp >= lastHubExecutionTimestamp
}

export function logSimulationTestModeApply(
  phase: 'read' | 'apply',
  snapshot: SimulationTestModeSnapshot | null,
  applied: HubExecutionResultLike | null,
) {
  devLog(`[simulation-test-mode] hub ${phase}`, {
    readSlug: snapshot?.slug ?? null,
    readRoutineId: snapshot?.routineId ?? null,
    readSource: snapshot?.source ?? null,
    appliedMode: applied?.mode ?? null,
    appliedModeLabel: applied?.modeLabel ?? null,
  })
}
