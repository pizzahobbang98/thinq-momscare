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
    label: '냄새 때문에 너무 힘들어.',
    tab: 'NAUSEA_MODE',
    hubMode: 'NAUSEA_MODE',
    simulationMode: 'morning_sickness',
    routineId: 'nausea_food',
    destination: null,
  },
  {
    id: 'nausea_2',
    label: '음식 냄새가 힘들어.',
    tab: 'NAUSEA_MODE',
    hubMode: 'NAUSEA_MODE',
    simulationMode: 'morning_sickness',
    routineId: 'nausea_food',
    destination: null,
  },
  {
    id: 'nausea_3',
    label: '속이 울렁거려.',
    tab: 'NAUSEA_MODE',
    hubMode: 'NAUSEA_MODE',
    simulationMode: 'morning_sickness',
    routineId: 'nausea_food',
    destination: null,
  },
  {
    id: 'nausea_4',
    label: '냄새 좀 줄여줘.',
    tab: 'NAUSEA_MODE',
    hubMode: 'NAUSEA_MODE',
    simulationMode: 'morning_sickness',
    routineId: 'nausea_food',
    destination: null,
  },
  {
    id: 'sleep_1',
    label: '왜 이렇게 잠이 안들지.',
    tab: 'SLEEP_MODE',
    hubMode: 'SLEEP_MODE',
    simulationMode: 'sleep',
    routineId: 'sleep_care',
    destination: null,
  },
  {
    id: 'sleep_2',
    label: '잠이 안 와.',
    tab: 'SLEEP_MODE',
    hubMode: 'SLEEP_MODE',
    simulationMode: 'sleep',
    routineId: 'sleep_care',
    destination: null,
  },
  {
    id: 'sleep_3',
    label: '편하게 자고 싶어.',
    tab: 'SLEEP_MODE',
    hubMode: 'SLEEP_MODE',
    simulationMode: 'sleep',
    routineId: 'sleep_care',
    destination: null,
  },
  {
    id: 'sleep_4',
    label: '조용히 잠들고 싶어.',
    tab: 'SLEEP_MODE',
    hubMode: 'SLEEP_MODE',
    simulationMode: 'sleep',
    routineId: 'sleep_care',
    destination: null,
  },
  {
    id: 'ocean_1',
    label: '시원한 바다 보고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_ocean',
    routineId: 'destination_ocean',
    destination: 'ocean',
  },
  {
    id: 'ocean_2',
    label: '바다에 가고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_ocean',
    routineId: 'destination_ocean',
    destination: 'ocean',
  },
  {
    id: 'ocean_3',
    label: '파도 소리 듣고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_ocean',
    routineId: 'destination_ocean',
    destination: 'ocean',
  },
  {
    id: 'ocean_4',
    label: '바다 보면서 쉬고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_ocean',
    routineId: 'destination_ocean',
    destination: 'ocean',
  },
  {
    id: 'forest_1',
    label: '조용한 숲에 가고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_forest',
    routineId: 'destination_forest',
    destination: 'forest',
  },
  {
    id: 'forest_2',
    label: '숲에 가고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_forest',
    routineId: 'destination_forest',
    destination: 'forest',
  },
  {
    id: 'forest_3',
    label: '초록색 나무 보고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_forest',
    routineId: 'destination_forest',
    destination: 'forest',
  },
  {
    id: 'forest_4',
    label: '자연 속에 있고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_forest',
    routineId: 'destination_forest',
    destination: 'forest',
  },
  {
    id: 'city_1',
    label: '도시 야경 보고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_city',
    routineId: 'destination_city',
    destination: 'city',
  },
  {
    id: 'city_2',
    label: '야경 보고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_city',
    routineId: 'destination_city',
    destination: 'city',
  },
  {
    id: 'city_3',
    label: '반짝이는 도시 보고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_city',
    routineId: 'destination_city',
    destination: 'city',
  },
  {
    id: 'city_4',
    label: '호텔 라운지처럼 해줘.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_city',
    routineId: 'destination_city',
    destination: 'city',
  },
  {
    id: 'housework_1',
    label: '몸이 너무 무거워.',
    tab: 'HOUSEWORK_MODE',
    hubMode: 'HOUSEWORK_MODE',
    simulationMode: 'housework',
    routineId: 'housework_care',
    destination: null,
  },
  {
    id: 'housework_2',
    label: '움직이기 힘들어.',
    tab: 'HOUSEWORK_MODE',
    hubMode: 'HOUSEWORK_MODE',
    simulationMode: 'housework',
    routineId: 'housework_care',
    destination: null,
  },
  {
    id: 'housework_3',
    label: '집안일이 힘들어.',
    tab: 'HOUSEWORK_MODE',
    hubMode: 'HOUSEWORK_MODE',
    simulationMode: 'housework',
    routineId: 'housework_care',
    destination: null,
  },
  {
    id: 'housework_4',
    label: '청소하기 힘들어.',
    tab: 'HOUSEWORK_MODE',
    hubMode: 'HOUSEWORK_MODE',
    simulationMode: 'housework',
    routineId: 'housework_care',
    destination: null,
  },
]

export const PREPARING_HUB_DEMO_UTTERANCES: PreparingHubDemoUtterance[] = [
  { id: 'condition', mode: 'condition', label: '오늘 컨디션이 별로야.' },
  { id: 'sleep-rhythm', mode: 'sleep-rhythm', label: '오늘은 푹 자고 싶어.' },
  { id: 'refresh', mode: 'refresh', label: '집에만 있으니까 너무 답답해.' },
  { id: 'rest-ready', mode: 'rest-ready', label: '너무 지친다.' },
  { id: 'couple-routine', mode: 'couple-routine', label: '예쁜 곳에서 저녁 먹고 싶어.' },
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
