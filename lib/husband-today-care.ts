export type HusbandModeRunDeviceResult = {
  device: string
  action: string
  label?: string
  status: 'actual' | 'mock' | 'planned'
}

export type HusbandModeRun = {
  id: string
  mode: string
  mode_label: string
  created_at: string
  husband_card: string | null
  reply?: string | null
  input_text?: string | null
  signals?: string[] | null
  device_results: HusbandModeRunDeviceResult[] | null
}

export type TodayRecommendationContent = {
  headline: string
  description: string
  hasTodayRun: boolean
  latestRun: HusbandModeRun | null
  todayRuns: HusbandModeRun[]
  showRecipeButton: boolean
  insightSummary: string
}

export type HouseworkSuggestionContent = {
  text: string
  hasTodayRun: boolean
}

const MODE_RECOMMENDATION_COPY: Record<
  string,
  { headline: string; description: string; showRecipeButton?: boolean }
> = {
  NAUSEA_MODE: {
    headline: '오늘 저녁은 담백한 메뉴가 좋아요.',
    description:
      '강한 향이 나는 음식보다 부담이 적은 메뉴를 고르면 더 편안한 저녁이 될 수 있어요.',
    showRecipeButton: true,
  },
  SLEEP_MODE: {
    headline: '오늘 밤은 조용한 환경이 좋아요.',
    description:
      '늦은 시간의 TV 소리와 밝은 조명을 줄이면 더 편안한 밤을 만들 수 있어요.',
  },
  TRAVEL_MODE: {
    headline: '오늘은 집에서도 기분 전환이 되게 도와주세요.',
    description:
      '조명과 소리를 부드럽게 맞추고, 함께 쉬는 시간을 만들어보면 좋아요.',
  },
  HOUSEWORK_MODE: {
    headline: '오늘은 집안일을 조금 먼저 정리해두면 좋아요.',
    description:
      '세탁물, 식기, 청소처럼 바로 처리해야 하는 일을 미리 살펴보면 도움이 될 수 있어요.',
  },
  MORNING_BRIEFING: {
    headline: '오늘 필요한 배려를 천천히 확인하면 좋아요.',
    description: '하루를 시작할 때 부담 없는 행동부터 준비해보면 좋아요.',
  },
}

const MODE_HOUSEWORK_COPY: Record<string, string> = {
  NAUSEA_MODE: '식사 후 냄새가 오래 남지 않도록 주방 정리를 먼저 해두면 좋아요.',
  SLEEP_MODE: '밤에는 소리가 큰 집안일을 미리 끝내두면 좋아요.',
  TRAVEL_MODE: '쉬는 분위기를 위해 주변을 가볍게 정리해두면 좋아요.',
  HOUSEWORK_MODE: '세탁물이나 식기처럼 바로 확인해야 하는 일을 먼저 살펴보면 좋아요.',
  MORNING_BRIEFING: '오늘 필요한 집안일은 급한 것부터 짧게 정리해두면 좋아요.',
}

const FALLBACK_RECOMMENDATION: TodayRecommendationContent = {
  headline: '오늘 필요한 배려가 생기면 여기에서 알려드릴게요.',
  description:
    '허브에서 케어 모드가 실행되면 ThinQ Mom이 자연스러운 행동 제안으로 바꿔드려요.',
  hasTodayRun: false,
  latestRun: null,
  todayRuns: [],
  showRecipeButton: false,
  insightSummary:
    '아내의 세부 상태를 보여주기보다, 오늘 해주면 좋은 행동만 알려드려요.',
}

const FALLBACK_HOUSEWORK: HouseworkSuggestionContent = {
  text: '오늘 실행된 케어가 생기면 필요한 집안일 제안을 알려드릴게요.',
  hasTodayRun: false,
}

export const RECIPE_SUGGESTIONS = [
  '맑은 국물',
  '부드러운 죽',
  '냄새가 적은 샌드위치',
  '담백한 면 요리',
  '과일이나 요거트',
] as const

const DIRECT_WIFE_PATTERNS = [
  /아내가\s+/g,
  /아내는\s+/g,
  /아내의\s+/g,
  /아내 상태/g,
  /입덧이\s*심/g,
  /잠을\s*못\s*자/g,
  /몸\s*상태/g,
  /증상/g,
  /우울/g,
  /피곤/g,
]

function isTodayRun(createdAt: string, todayStartISO: string) {
  return new Date(createdAt).getTime() >= new Date(todayStartISO).getTime()
}

export function sanitizeHusbandText(text: string) {
  let sanitized = text.trim()
  if (!sanitized) return ''

  for (const pattern of DIRECT_WIFE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '')
  }

  sanitized = sanitized.replace(/\s{2,}/g, ' ').trim()
  return sanitized
}

function pickPrimaryRun(runs: HusbandModeRun[]) {
  const withCard = runs.find((run) => run.husband_card?.trim())
  if (withCard) return withCard
  return runs[0] ?? null
}

function getModeRecommendation(mode: string) {
  return (
    MODE_RECOMMENDATION_COPY[mode] ?? {
      headline: '오늘 필요한 배려를 행동으로 준비해보세요.',
      description: '허브 대화 기록을 바탕으로 오늘 도움이 될 행동을 정리했어요.',
    }
  )
}

function buildFromRun(
  run: HusbandModeRun,
  todayRuns: HusbandModeRun[],
  hasTodayRun: boolean,
): TodayRecommendationContent {
  const modeCopy = getModeRecommendation(run.mode)
  const sanitizedCard = run.husband_card ? sanitizeHusbandText(run.husband_card) : ''
  const description = sanitizedCard || modeCopy.description

  return {
    headline: modeCopy.headline,
    description,
    hasTodayRun,
    latestRun: run,
    todayRuns,
    showRecipeButton: modeCopy.showRecipeButton ?? run.mode === 'NAUSEA_MODE',
    insightSummary: FALLBACK_RECOMMENDATION.insightSummary,
  }
}

export function buildTodayRecommendationContent(
  allRuns: HusbandModeRun[],
  todayStartISO: string,
): TodayRecommendationContent {
  const todayRuns = allRuns.filter((run) => isTodayRun(run.created_at, todayStartISO))
  const recentRuns = allRuns.filter(
    (run) => run.mode !== 'AIR_OFF' && run.mode !== 'AIR_ON' && run.mode !== 'UNKNOWN',
  )

  if (todayRuns.length > 0) {
    const latest = pickPrimaryRun(todayRuns)
    if (latest) return buildFromRun(latest, todayRuns, true)
  }

  if (recentRuns.length > 0) {
    const latest = pickPrimaryRun(recentRuns)
    if (latest) return buildFromRun(latest, [], false)
  }

  return FALLBACK_RECOMMENDATION
}

export function buildHouseworkSuggestionContent(
  allRuns: HusbandModeRun[],
  todayStartISO: string,
): HouseworkSuggestionContent {
  const todayRuns = allRuns.filter((run) => isTodayRun(run.created_at, todayStartISO))
  const sourceRun = pickPrimaryRun(todayRuns) ?? pickPrimaryRun(allRuns)

  if (!sourceRun) return FALLBACK_HOUSEWORK

  const text =
    MODE_HOUSEWORK_COPY[sourceRun.mode] ??
    '오늘 필요한 집안일은 급한 것부터 짧게 정리해두면 좋아요.'

  return {
    text,
    hasTodayRun: todayRuns.length > 0,
  }
}

export function formatHusbandCareRunTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
