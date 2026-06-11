import { withIga } from '@/lib/korean'

export const FULL_PREGNANCY_DAYS = 280
export const DEFAULT_BABY_NICKNAME = '호빵'

export const PREGNANCY_JOURNEY_STORAGE_KEYS = {
  week: 'thinq_pregnancy_week',
  day: 'thinq_pregnancy_day',
  nickname: 'thinq_baby_nickname',
} as const

export type BabyStage = 'seed' | 'early' | 'middle' | 'growth' | 'late' | 'ready'

export type PregnancyProgress = {
  week: number
  day: number
  totalDays: number
  remainingDays: number
  stage: BabyStage
}

export type PregnancyJourneyView = PregnancyProgress & {
  nickname: string
  title: string
  progressLabel: string
  remainingLabel: string
  stageSubtitle: string
  stageMessage: string
  bubbleMessage: string
}

function clampWeek(week: number) {
  return Math.min(42, Math.max(0, Math.round(week)))
}

function clampDay(day: number) {
  return Math.min(6, Math.max(0, Math.round(day)))
}

export function getBabyStage(week: number): BabyStage {
  const normalizedWeek = clampWeek(week)
  if (normalizedWeek < 8) return 'seed'
  if (normalizedWeek < 13) return 'early'
  if (normalizedWeek < 21) return 'middle'
  if (normalizedWeek < 29) return 'growth'
  if (normalizedWeek < 37) return 'late'
  return 'ready'
}

export function getPregnancyProgress(week: number, day = 0): PregnancyProgress {
  const normalizedWeek = clampWeek(week)
  const normalizedDay = clampDay(day)
  const totalDays = normalizedWeek * 7 + normalizedDay
  const remainingDays = Math.max(0, FULL_PREGNANCY_DAYS - totalDays)

  return {
    week: normalizedWeek,
    day: normalizedDay,
    totalDays,
    remainingDays,
    stage: getBabyStage(normalizedWeek),
  }
}

export function getRemainingDays(week: number, day = 0) {
  return getPregnancyProgress(week, day).remainingDays
}

export function formatPregnancyWeekDay(week: number, day = 0) {
  const normalizedWeek = clampWeek(week)
  const normalizedDay = clampDay(day)
  return `현재 ${normalizedWeek}주 ${normalizedDay}일차`
}

export function formatRemainingDays(remainingDays: number, week = 0, day = 0) {
  if (week === 0 && day === 0 && remainingDays >= FULL_PREGNANCY_DAYS - 1) {
    return '만날 날까지 약 280일'
  }
  if (remainingDays <= 0) {
    return '곧 만날 수 있어요'
  }
  if (remainingDays === 1) {
    return '만날 날까지 하루 남았어요'
  }
  return `만날 날까지 약 ${remainingDays}일`
}

const STAGE_SUBTITLES: Record<BabyStage, string> = {
  seed: '작은 시작',
  early: '모습을 만들어가는 시기',
  middle: '엄마 리듬과 함께',
  growth: '움직임이 선명해지는 시기',
  late: '만날 준비를 하는 시기',
  ready: '곧 만날 시간',
}

export function getBabyStageSubtitle(stage: BabyStage) {
  return STAGE_SUBTITLES[stage]
}

export function getBabyStageMessage(stage: BabyStage, nickname: string) {
  const name = nickname.trim() || DEFAULT_BABY_NICKNAME
  const subject = withIga(name)

  switch (stage) {
    case 'seed':
      return '아주 작은 변화가 조용히 시작되고 있어요.'
    case 'early':
      return `${subject} 조금씩 자기 모습을 만들어가고 있어요.`
    case 'middle':
      return `오늘도 ${subject} 엄마의 리듬 안에서 자라고 있어요.`
    case 'growth':
      return '움직임이 더 선명해지는 시기예요. 엄마의 휴식도 함께 챙겨볼게요.'
    case 'late':
      return `${subject} 만날 준비를 차근차근 해가고 있어요.`
    case 'ready':
      return '이제 곧 만날 시간이 가까워지고 있어요.'
    default:
      return `${subject}와 함께하는 오늘을 응원해요.`
  }
}

export function getPregnancyJourneyBubbleMessage(stage: BabyStage) {
  if (stage === 'seed' || stage === 'early') {
    return '오늘은 무리하지 않는 리듬으로 집안 환경을 차분히 맞춰볼게요.'
  }
  if (stage === 'ready') {
    return '곧 만날 날을 위해 오늘도 편안한 하루를 함께 준비해볼게요.'
  }
  return '엄마의 컨디션에 맞춰 오늘의 집안 환경을 준비할게요.'
}

export function buildPregnancyJourneyTitle(nickname: string, week: number, day: number) {
  const name = nickname.trim() || DEFAULT_BABY_NICKNAME
  if (week === 0 && day === 0) {
    return `${withIga(name)}와 함께하는 첫날`
  }
  return `${withIga(name)}와 함께하는 오늘`
}

export function buildPregnancyJourneyView(
  week: number,
  day: number,
  nickname: string,
): PregnancyJourneyView {
  const progress = getPregnancyProgress(week, day)
  const resolvedNickname = nickname.trim() || DEFAULT_BABY_NICKNAME

  return {
    ...progress,
    nickname: resolvedNickname,
    title: buildPregnancyJourneyTitle(resolvedNickname, progress.week, progress.day),
    progressLabel: formatPregnancyWeekDay(progress.week, progress.day),
    remainingLabel: formatRemainingDays(progress.remainingDays, progress.week, progress.day),
    stageSubtitle: getBabyStageSubtitle(progress.stage),
    stageMessage: getBabyStageMessage(progress.stage, resolvedNickname),
    bubbleMessage: getPregnancyJourneyBubbleMessage(progress.stage),
  }
}

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function savePregnancyJourneyToStorage(options: {
  week: number
  day?: number
  nickname?: string
}) {
  try {
    const storage = getStorage()
    if (!storage) return

    storage.setItem(PREGNANCY_JOURNEY_STORAGE_KEYS.week, String(clampWeek(options.week)))
    storage.setItem(
      PREGNANCY_JOURNEY_STORAGE_KEYS.day,
      String(clampDay(options.day ?? 0)),
    )
    if (options.nickname?.trim()) {
      storage.setItem(PREGNANCY_JOURNEY_STORAGE_KEYS.nickname, options.nickname.trim())
    }
  } catch (error) {
    console.warn('[pregnancy] journey storage save failed:', error)
  }
}

export function readPregnancyJourneyFromStorage() {
  try {
    const storage = getStorage()
    if (!storage) return null

    const weekRaw = storage.getItem(PREGNANCY_JOURNEY_STORAGE_KEYS.week)
    const dayRaw = storage.getItem(PREGNANCY_JOURNEY_STORAGE_KEYS.day)
    const nickname = storage.getItem(PREGNANCY_JOURNEY_STORAGE_KEYS.nickname)

    if (weekRaw == null && dayRaw == null && !nickname) return null

    return {
      week: weekRaw != null && Number.isFinite(Number(weekRaw)) ? clampWeek(Number(weekRaw)) : 0,
      day: dayRaw != null && Number.isFinite(Number(dayRaw)) ? clampDay(Number(dayRaw)) : 0,
      nickname: nickname?.trim() || DEFAULT_BABY_NICKNAME,
    }
  } catch (error) {
    console.warn('[pregnancy] journey storage read failed:', error)
    return null
  }
}

export function resolvePregnancyJourneyInput(options: {
  week?: number | null
  day?: number | null
  nickname?: string | null
}) {
  const stored = readPregnancyJourneyFromStorage()

  const week =
    options.week != null && Number.isFinite(options.week)
      ? clampWeek(options.week)
      : (stored?.week ?? 0)

  const day =
    options.day != null && Number.isFinite(options.day)
      ? clampDay(options.day)
      : (stored?.day ?? 0)

  const nickname =
    options.nickname?.trim() || stored?.nickname?.trim() || DEFAULT_BABY_NICKNAME

  return buildPregnancyJourneyView(week, day, nickname)
}

export function calculateCurrentWeeksFromDueDate(dueDate: string) {
  const today = new Date()
  const due = new Date(dueDate)
  const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.min(42, 40 - Math.floor(daysUntilDue / 7)))
}

export function calculateDueDateFromWeeks(weeks: number) {
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + (40 - weeks) * 7)
  return dueDate.toISOString().split('T')[0]
}

export function calculatePregnancyDayFromDueDate(dueDate: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const totalDays = Math.max(0, FULL_PREGNANCY_DAYS - daysUntilDue)
  return {
    week: Math.floor(totalDays / 7),
    day: totalDays % 7,
  }
}
