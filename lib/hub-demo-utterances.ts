import type { SimulationTestModeSlug } from '@/lib/simulation-test-mode-sync'
import type { SimulationRoutineId, TravelDestination } from '@/lib/simulation-routine-bridge'
import type { PreparationMode } from '@/lib/shared-demo-state'

export type HubDemoModeTab = 'NAUSEA_MODE' | 'SLEEP_MODE' | 'TRAVEL_MODE' | 'HOUSEWORK_MODE'

export type HubDemoUtterance = {
  id: string
  label: string
  tab: HubDemoModeTab
  hubMode: HubDemoModeTab
  simulationMode: SimulationTestModeSlug
  routineId: SimulationRoutineId
  destination: TravelDestination | null
}

export type PreparingHubDemoUtterance = {
  id: string
  label: string
  mode: PreparationMode
}

export const HUB_DEMO_UTTERANCES: HubDemoUtterance[] = [
  {
    id: 'nausea_1',
    label: '음식 냄새 때문에 속이 울렁거려.',
    tab: 'NAUSEA_MODE',
    hubMode: 'NAUSEA_MODE',
    simulationMode: 'morning_sickness',
    routineId: 'nausea_food',
    destination: null,
  },
  {
    id: 'nausea_2',
    label: '주방 냄새를 줄여줘.',
    tab: 'NAUSEA_MODE',
    hubMode: 'NAUSEA_MODE',
    simulationMode: 'morning_sickness',
    routineId: 'nausea_food',
    destination: null,
  },
  {
    id: 'nausea_3',
    label: '냄새 때문에 메스꺼워.',
    tab: 'NAUSEA_MODE',
    hubMode: 'NAUSEA_MODE',
    simulationMode: 'morning_sickness',
    routineId: 'nausea_food',
    destination: null,
  },
  {
    id: 'nausea_4',
    label: '집 안 공기를 상쾌하게 해줘.',
    tab: 'NAUSEA_MODE',
    hubMode: 'NAUSEA_MODE',
    simulationMode: 'morning_sickness',
    routineId: 'nausea_food',
    destination: null,
  },
  {
    id: 'sleep_1',
    label: '잠이 잘 오게 해줘.',
    tab: 'SLEEP_MODE',
    hubMode: 'SLEEP_MODE',
    simulationMode: 'sleep',
    routineId: 'sleep_care',
    destination: null,
  },
  {
    id: 'sleep_2',
    label: '방을 조용하게 해줘.',
    tab: 'SLEEP_MODE',
    hubMode: 'SLEEP_MODE',
    simulationMode: 'sleep',
    routineId: 'sleep_care',
    destination: null,
  },
  {
    id: 'sleep_3',
    label: '수면 모드로 바꿔줘.',
    tab: 'SLEEP_MODE',
    hubMode: 'SLEEP_MODE',
    simulationMode: 'sleep',
    routineId: 'sleep_care',
    destination: null,
  },
  {
    id: 'sleep_4',
    label: '조명을 어둡게 해줘.',
    tab: 'SLEEP_MODE',
    hubMode: 'SLEEP_MODE',
    simulationMode: 'sleep',
    routineId: 'sleep_care',
    destination: null,
  },
  {
    id: 'ocean_1',
    label: '바다 분위기로 바꿔줘.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_ocean',
    routineId: 'destination_ocean',
    destination: 'ocean',
  },
  {
    id: 'ocean_2',
    label: '파도 소리를 들려줘.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_ocean',
    routineId: 'destination_ocean',
    destination: 'ocean',
  },
  {
    id: 'ocean_3',
    label: '바다를 보며 쉬고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_ocean',
    routineId: 'destination_ocean',
    destination: 'ocean',
  },
  {
    id: 'ocean_4',
    label: '시원한 해변처럼 바꿔줘.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_ocean',
    routineId: 'destination_ocean',
    destination: 'ocean',
  },
  {
    id: 'forest_1',
    label: '숲 분위기로 바꿔줘.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_forest',
    routineId: 'destination_forest',
    destination: 'forest',
  },
  {
    id: 'forest_2',
    label: '초록빛 공간으로 바꿔줘.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_forest',
    routineId: 'destination_forest',
    destination: 'forest',
  },
  {
    id: 'forest_3',
    label: '숲에서 쉬고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_forest',
    routineId: 'destination_forest',
    destination: 'forest',
  },
  {
    id: 'forest_4',
    label: '자연처럼 공기를 맞춰줘.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_forest',
    routineId: 'destination_forest',
    destination: 'forest',
  },
  {
    id: 'city_1',
    label: '도시 야경을 보여줘.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_city',
    routineId: 'destination_city',
    destination: 'city',
  },
  {
    id: 'city_2',
    label: '호텔 분위기로 바꿔줘.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_city',
    routineId: 'destination_city',
    destination: 'city',
  },
  {
    id: 'city_3',
    label: '야경을 보며 쉬고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_city',
    routineId: 'destination_city',
    destination: 'city',
  },
  {
    id: 'city_4',
    label: '도시 호텔처럼 바꿔줘.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_city',
    routineId: 'destination_city',
    destination: 'city',
  },
  {
    id: 'housework_1',
    label: '빨래와 청소를 도와줘.',
    tab: 'HOUSEWORK_MODE',
    hubMode: 'HOUSEWORK_MODE',
    simulationMode: 'housework',
    routineId: 'housework_care',
    destination: null,
  },
  {
    id: 'housework_2',
    label: '집안일 순서를 알려줘.',
    tab: 'HOUSEWORK_MODE',
    hubMode: 'HOUSEWORK_MODE',
    simulationMode: 'housework',
    routineId: 'housework_care',
    destination: null,
  },
  {
    id: 'housework_3',
    label: '오늘 할 집안일을 알려줘.',
    tab: 'HOUSEWORK_MODE',
    hubMode: 'HOUSEWORK_MODE',
    simulationMode: 'housework',
    routineId: 'housework_care',
    destination: null,
  },
  {
    id: 'housework_4',
    label: '가사 케어를 시작해줘.',
    tab: 'HOUSEWORK_MODE',
    hubMode: 'HOUSEWORK_MODE',
    simulationMode: 'housework',
    routineId: 'housework_care',
    destination: null,
  },
]

export const PREPARING_HUB_DEMO_UTTERANCES: PreparingHubDemoUtterance[] = [
  { id: 'condition', mode: 'condition', label: '아침 컨디션을 맞춰줘.' },
  { id: 'sleep-rhythm', mode: 'sleep-rhythm', label: '수면 리듬을 맞춰줘.' },
  { id: 'refresh', mode: 'refresh', label: '마음을 환기하고 싶어.' },
  { id: 'rest-ready', mode: 'rest-ready', label: '편안하게 쉬고 싶어.' },
  { id: 'couple-routine', mode: 'couple-routine', label: '우리 둘의 저녁을 준비해줘.' },
]

export const PREPARING_HUB_DEMO_MODE_TABS: { mode: PreparationMode; label: string }[] = [
  { mode: 'condition', label: '컨디션' },
  { mode: 'sleep-rhythm', label: '수면 리듬' },
  { mode: 'refresh', label: '마음 환기' },
  { mode: 'rest-ready', label: '휴식 준비' },
  { mode: 'couple-routine', label: '둘의 저녁' },
]

const utteranceById = new Map(HUB_DEMO_UTTERANCES.map((item) => [item.id, item]))
const utteranceByLabel = new Map(HUB_DEMO_UTTERANCES.map((item) => [item.label, item]))

export function findHubDemoUtteranceByLabel(label: string): HubDemoUtterance | null {
  return utteranceByLabel.get(label.trim()) ?? null
}

export function findHubDemoUtteranceById(id: string): HubDemoUtterance | null {
  return utteranceById.get(id) ?? null
}

export function getHubDemoUtterancesForTab(
  tab: HubDemoModeTab,
  destination?: TravelDestination | null,
): HubDemoUtterance[] {
  return HUB_DEMO_UTTERANCES.filter((item) => {
    if (item.tab !== tab) return false
    if (tab === 'TRAVEL_MODE' && destination) {
      return item.destination === destination
    }
    return true
  })
}

export const HUB_DEMO_MODE_TABS: { mode: HubDemoModeTab; label: string }[] = [
  { mode: 'NAUSEA_MODE', label: '입덧 케어' },
  { mode: 'SLEEP_MODE', label: '수면 케어' },
  { mode: 'TRAVEL_MODE', label: '휴양지 케어' },
  { mode: 'HOUSEWORK_MODE', label: '가사 케어' },
]

export const HUB_DEMO_TRAVEL_SUB_TABS: {
  id: TravelDestination
  label: string
  chipClass: string
}[] = [
  { id: 'ocean', label: '바다', chipClass: 'border-sky-100 text-sky-900 hover:bg-sky-50' },
  { id: 'forest', label: '숲', chipClass: 'border-emerald-100 text-emerald-900 hover:bg-emerald-50' },
  { id: 'city', label: '도시', chipClass: 'border-amber-100 text-amber-900 hover:bg-amber-50' },
]

export const HUB_DEMO_TAB_STYLES: Record<
  HubDemoModeTab,
  { cardClass: string; chipClass: string }
> = {
  NAUSEA_MODE: {
    cardClass: 'border-rose-100 bg-rose-50/60',
    chipClass: 'border-rose-100 text-rose-900 hover:bg-rose-50',
  },
  SLEEP_MODE: {
    cardClass: 'border-blue-100 bg-blue-50/60',
    chipClass: 'border-blue-100 text-blue-900 hover:bg-blue-50',
  },
  TRAVEL_MODE: {
    cardClass: 'border-purple-100 bg-purple-50/60',
    chipClass: 'border-purple-100 text-purple-900 hover:bg-purple-50',
  },
  HOUSEWORK_MODE: {
    cardClass: 'border-orange-100 bg-orange-50/60',
    chipClass: 'border-orange-100 text-orange-900 hover:bg-orange-50',
  },
}
