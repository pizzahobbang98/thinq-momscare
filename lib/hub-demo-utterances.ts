import type { SimulationTestModeSlug } from '@/lib/simulation-test-mode-sync'
import type { SimulationRoutineId, TravelDestination } from '@/lib/simulation-routine-bridge'

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

export const HUB_DEMO_UTTERANCES: HubDemoUtterance[] = [
  {
    id: 'nausea_1',
    label: '냉장고 냄새 때문에 속이 울렁거려.',
    tab: 'NAUSEA_MODE',
    hubMode: 'NAUSEA_MODE',
    simulationMode: 'morning_sickness',
    routineId: 'nausea_food',
    destination: null,
  },
  {
    id: 'nausea_2',
    label: '주방 냄새가 너무 예민하게 느껴져서 힘들어.',
    tab: 'NAUSEA_MODE',
    hubMode: 'NAUSEA_MODE',
    simulationMode: 'morning_sickness',
    routineId: 'nausea_food',
    destination: null,
  },
  {
    id: 'nausea_3',
    label: '음식 냄새만 맡아도 메스꺼워.',
    tab: 'NAUSEA_MODE',
    hubMode: 'NAUSEA_MODE',
    simulationMode: 'morning_sickness',
    routineId: 'nausea_food',
    destination: null,
  },
  {
    id: 'nausea_4',
    label: '집 안 냄새를 좀 상쾌하게 바꿔줘.',
    tab: 'NAUSEA_MODE',
    hubMode: 'NAUSEA_MODE',
    simulationMode: 'morning_sickness',
    routineId: 'nausea_food',
    destination: null,
  },
  {
    id: 'sleep_1',
    label: '요즘 잠이 잘 안 와서 방을 좀 편안하게 만들고 싶어.',
    tab: 'SLEEP_MODE',
    hubMode: 'SLEEP_MODE',
    simulationMode: 'sleep',
    routineId: 'sleep_care',
    destination: null,
  },
  {
    id: 'sleep_2',
    label: '밤에 자주 깨서 조명하고 온도를 차분하게 맞춰줘.',
    tab: 'SLEEP_MODE',
    hubMode: 'SLEEP_MODE',
    simulationMode: 'sleep',
    routineId: 'sleep_care',
    destination: null,
  },
  {
    id: 'sleep_3',
    label: '잠들기 좋은 분위기로 집 안을 바꿔줘.',
    tab: 'SLEEP_MODE',
    hubMode: 'SLEEP_MODE',
    simulationMode: 'sleep',
    routineId: 'sleep_care',
    destination: null,
  },
  {
    id: 'sleep_4',
    label: '오늘은 푹 잘 수 있게 조용하고 어둡게 해줘.',
    tab: 'SLEEP_MODE',
    hubMode: 'SLEEP_MODE',
    simulationMode: 'sleep',
    routineId: 'sleep_care',
    destination: null,
  },
  {
    id: 'ocean_1',
    label: '시원한 바닷가 숙소에 온 것처럼 쉬고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_ocean',
    routineId: 'destination_ocean',
    destination: 'ocean',
  },
  {
    id: 'ocean_2',
    label: '파도 소리가 들리는 휴양지 느낌으로 바꿔줘.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_ocean',
    routineId: 'destination_ocean',
    destination: 'ocean',
  },
  {
    id: 'ocean_3',
    label: '오늘은 바다 보이는 리조트처럼 집에서 쉬고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_ocean',
    routineId: 'destination_ocean',
    destination: 'ocean',
  },
  {
    id: 'ocean_4',
    label: '답답해서 시원한 해변 분위기로 전환하고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_ocean',
    routineId: 'destination_ocean',
    destination: 'ocean',
  },
  {
    id: 'forest_1',
    label: '조용한 숲속 숙소에 온 것처럼 쉬고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_forest',
    routineId: 'destination_forest',
    destination: 'forest',
  },
  {
    id: 'forest_2',
    label: '초록빛이 느껴지는 편안한 공간으로 바꿔줘.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_forest',
    routineId: 'destination_forest',
    destination: 'forest',
  },
  {
    id: 'forest_3',
    label: '나무가 보이는 산장처럼 차분하게 쉬고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_forest',
    routineId: 'destination_forest',
    destination: 'forest',
  },
  {
    id: 'forest_4',
    label: '오늘은 자연 속에 있는 것처럼 공기랑 조명을 맞춰줘.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_forest',
    routineId: 'destination_forest',
    destination: 'forest',
  },
  {
    id: 'city_1',
    label: '도시 야경이 보이는 호텔에서 쉬는 느낌이면 좋겠어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_city',
    routineId: 'destination_city',
    destination: 'city',
  },
  {
    id: 'city_2',
    label: '밤의 호텔 라운지처럼 조용하고 세련된 분위기로 바꿔줘.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_city',
    routineId: 'destination_city',
    destination: 'city',
  },
  {
    id: 'city_3',
    label: '창밖에 야경이 보이는 고층 호텔처럼 쉬고 싶어.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_city',
    routineId: 'destination_city',
    destination: 'city',
  },
  {
    id: 'city_4',
    label: '오늘은 도심 속 호텔에 온 것처럼 분위기를 바꿔줘.',
    tab: 'TRAVEL_MODE',
    hubMode: 'TRAVEL_MODE',
    simulationMode: 'travel_city',
    routineId: 'destination_city',
    destination: 'city',
  },
  {
    id: 'housework_1',
    label: '빨래랑 청소를 한 번에 정리하고 싶은데 도와줘.',
    tab: 'HOUSEWORK_MODE',
    hubMode: 'HOUSEWORK_MODE',
    simulationMode: 'housework',
    routineId: 'housework_care',
    destination: null,
  },
  {
    id: 'housework_2',
    label: '집안일이 밀려서 지금 할 일부터 순서대로 알려줘.',
    tab: 'HOUSEWORK_MODE',
    hubMode: 'HOUSEWORK_MODE',
    simulationMode: 'housework',
    routineId: 'housework_care',
    destination: null,
  },
  {
    id: 'housework_3',
    label: '오늘 해야 할 세탁이랑 청소를 알아서 챙겨줘.',
    tab: 'HOUSEWORK_MODE',
    hubMode: 'HOUSEWORK_MODE',
    simulationMode: 'housework',
    routineId: 'housework_care',
    destination: null,
  },
  {
    id: 'housework_4',
    label: '몸이 무거워서 가전들이 집안일을 좀 나눠서 해줬으면 좋겠어.',
    tab: 'HOUSEWORK_MODE',
    hubMode: 'HOUSEWORK_MODE',
    simulationMode: 'housework',
    routineId: 'housework_care',
    destination: null,
  },
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
