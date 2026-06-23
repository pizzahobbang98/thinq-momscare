import type {
  DemoCareState,
  DemoLightPower,
  DemoPregnancyStatus,
  PreparationMode,
  SharedDemoState,
} from '@/lib/shared-demo-state'

export type StandbyDisplayState = {
  key: string
  active: boolean
  title: string
  subtitle: string
  modeLabel: string
  image: string | null
  background: string
  accent: string
  dimmed: boolean
}

type StandbySourceState = {
  pregnancyStatus: DemoPregnancyStatus
  routine: string | null
  simulationRoutine: string | null
  preparationMode: PreparationMode
  lightPower: DemoLightPower
  careState: DemoCareState
  latestCareModeLabel?: string | null
}

const DEFAULT_STANDBY: StandbyDisplayState = {
  key: 'default',
  active: false,
  title: '홈 화면',
  subtitle: '케어 콘텐츠 재생을 기다리고 있어요',
  modeLabel: '기본 모드',
  image: null,
  background: 'linear-gradient(135deg, #c7dbe7 0%, #e6e0d5 52%, #c9d7bc 100%)',
  accent: '#7A4A00',
  dimmed: false,
}

const PREPARATION_STANDBY: Record<PreparationMode, StandbyDisplayState> = {
  condition: {
    key: 'prep-condition',
    active: true,
    title: '모닝 스트레칭',
    subtitle: '둘이 가볍게 시작하는 움직임을 안내해요',
    modeLabel: '컨디션 밸런스',
    image: '/images/standby-mom/pregnancy-prep-main.png',
    background: 'linear-gradient(135deg, #6f8060 0%, #c4ad79 50%, #664f4f 100%)',
    accent: '#C4AD79',
    dimmed: false,
  },
  'sleep-rhythm': {
    key: 'prep-sleep-rhythm',
    active: true,
    title: '수면 호흡 가이드',
    subtitle: '호흡 속도를 낮추는 가이드를 재생 중',
    modeLabel: '수면 리듬',
    image: '/images/standby-mom/pregnancy-prep-sleep.png',
    background: 'linear-gradient(135deg, #252947 0%, #555a85 50%, #9a7889 100%)',
    accent: '#9A7889',
    dimmed: false,
  },
  refresh: {
    key: 'prep-refresh',
    active: true,
    title: '숲길 호흡 영상',
    subtitle: '자연의 움직임과 느린 호흡 가이드를 재생해요',
    modeLabel: '마음 환기',
    image: '/images/standby-mom/pregnancy-prep-air-care.png',
    background: 'linear-gradient(135deg, #4d7569 0%, #8d9f83 50%, #776479 100%)',
    accent: '#8D9F83',
    dimmed: false,
  },
  'rest-ready': {
    key: 'prep-rest-ready',
    active: true,
    title: '잔잔한 재즈',
    subtitle: '휴식에 어울리는 플레이리스트 재생 중',
    modeLabel: '휴식 준비',
    image: '/images/standby-mom/pregnancy-prep-calm-room.png',
    background: 'linear-gradient(135deg, #735240 0%, #bd8e61 50%, #57424c 100%)',
    accent: '#BD8E61',
    dimmed: false,
  },
  'couple-routine': {
    key: 'prep-couple-routine',
    active: true,
    title: '둘만의 플레이리스트',
    subtitle: '임신 준비의 긴장을 내려놓는 음악을 재생해요',
    modeLabel: '둘의 저녁',
    image: '/images/standby-mom/pregnancy-prep-calm-room.png',
    background: 'linear-gradient(135deg, #9a5868 0%, #c8998f 50%, #5d4b67 100%)',
    accent: '#C8998F',
    dimmed: false,
  },
}

const PREGNANT_STANDBY: Record<string, StandbyDisplayState> = {
  nausea_food: {
    key: 'nausea-food',
    active: true,
    title: '산뜻한 주방 가이드',
    subtitle: '냄새 부담이 적은 식사와 환기 방법을 표시해요',
    modeLabel: '입덧 케어',
    image: null,
    background: 'linear-gradient(135deg, #b8e8ed 0%, #e8f5ec 52%, #b9d7dd 100%)',
    accent: '#58BFD0',
    dimmed: false,
  },
  sleep_care: {
    key: 'sleep-care',
    active: true,
    title: '수면 콘텐츠',
    subtitle: '수면 케어 중에는 화면 자극을 낮춰요',
    modeLabel: '수면 케어',
    image: null,
    background: 'linear-gradient(135deg, #252b58 0%, #555b89 50%, #927f93 100%)',
    accent: '#927F93',
    dimmed: true,
  },
  housework_care: {
    key: 'housework-care',
    active: false,
    title: '꺼짐',
    subtitle: '가사 케어 중에는 스탠바이미를 켜지 않아요',
    modeLabel: '가사 케어',
    image: null,
    background: 'linear-gradient(135deg, #efd08d 0%, #eae4d5 50%, #a9cfc6 100%)',
    accent: '#C7A650',
    dimmed: false,
  },
  destination_ocean: {
    key: 'destination-ocean',
    active: true,
    title: '파도 영상',
    subtitle: '여유로운 바닷가 풍경과 파도 소리 재생 중',
    modeLabel: '바다 휴양',
    image: null,
    background: 'linear-gradient(135deg, #3fa9d0 0%, #aad9df 52%, #dfc486 100%)',
    accent: '#3FA9D0',
    dimmed: false,
  },
  destination_forest: {
    key: 'destination-forest',
    active: true,
    title: '숲 영상',
    subtitle: '고요한 숲 풍경과 자연 소리 재생 중',
    modeLabel: '숲 휴양',
    image: null,
    background: 'linear-gradient(135deg, #477c5b 0%, #91b98b 52%, #d4c99c 100%)',
    accent: '#477C5B',
    dimmed: false,
  },
  destination_city: {
    key: 'destination-city',
    active: true,
    title: '도시 야경',
    subtitle: '차분한 도심 라운지 영상을 재생 중',
    modeLabel: '도시 라운지',
    image: null,
    background: 'linear-gradient(135deg, #25234d 0%, #6d5385 52%, #c17282 100%)',
    accent: '#C17282',
    dimmed: false,
  },
}

const HUB_MODE_TO_ROUTINE: Record<string, string> = {
  NAUSEA_MODE: 'nausea_food',
  SLEEP_MODE: 'sleep_care',
  HOUSEWORK_MODE: 'housework_care',
  TRAVEL_MODE: 'destination_ocean',
}

export function getStandbyDisplayState(state: StandbySourceState): StandbyDisplayState {
  if (state.pregnancyStatus === 'preparing') {
    if (state.careState === 'idle' && !state.simulationRoutine && !state.routine) return DEFAULT_STANDBY
    return PREPARATION_STANDBY[state.preparationMode] ?? PREPARATION_STANDBY.refresh
  }

  const resolvedRoutine = state.simulationRoutine ?? (state.routine ? HUB_MODE_TO_ROUTINE[state.routine] : null)
  const presentation = resolvedRoutine ? PREGNANT_STANDBY[resolvedRoutine] : null
  if (!presentation) return DEFAULT_STANDBY

  return {
    ...presentation,
    modeLabel: state.latestCareModeLabel || presentation.modeLabel,
  }
}

export function getStandbyDisplayStateFromSharedState(state: SharedDemoState): StandbyDisplayState {
  return getStandbyDisplayState({
    pregnancyStatus: state.pregnancyStatus,
    routine: state.currentRoutine,
    simulationRoutine: state.simulationRoutine,
    preparationMode: state.preparationMode,
    lightPower: state.lightPower,
    careState: state.careState,
    latestCareModeLabel: state.latestCareModeLabel,
  })
}
