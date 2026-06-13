export type PregnancyStatus = 'preparing' | 'pregnant' | 'postpartum'

export const PREGNANCY_STATUS_LABELS: Record<PregnancyStatus, string> = {
  preparing: '임신 준비',
  pregnant: '임신중',
  postpartum: '출산 후',
}

export const CARE_INTEREST_OPTIONS = [
  '수면 리듬',
  '실내 공기',
  '식사 루틴',
  '병원 일정',
  '마음 기록',
] as const

export type CareInterest = (typeof CARE_INTEREST_OPTIONS)[number]

function normalizeStatus(value: string | null | undefined): PregnancyStatus | null {
  if (value === 'preparing' || value === 'pregnant' || value === 'postpartum') {
    return value
  }
  return null
}

function hasPregnancyTimingData(input: {
  pregnancyWeek?: number | null
  dueDate?: string | null
  weeksParam?: string | null
}): boolean {
  if (input.dueDate?.trim()) return true
  if (input.pregnancyWeek != null && input.pregnancyWeek > 0) return true
  if (input.weeksParam) {
    const parsed = Number(input.weeksParam)
    if (Number.isFinite(parsed) && parsed > 0) return true
  }
  return false
}

export type ResolvePregnancyStatusInput = {
  profileStatus?: string | null
  onboardingStatus?: string | null
  supabaseStatus?: string | null
  urlStatus?: string | null
  pregnancyWeek?: number | null
  dueDate?: string | null
  weeksParam?: string | null
}

/**
 * An explicit URL status represents the screen the user asked to open.
 * Otherwise saved profile data wins, followed by pregnancy timing signals.
 */
export function resolvePregnancyStatus(input: ResolvePregnancyStatusInput): PregnancyStatus {
  const urlStatus = normalizeStatus(input.urlStatus)
  if (urlStatus) {
    return urlStatus
  }

  const savedStatus =
    normalizeStatus(input.profileStatus) ??
    normalizeStatus(input.onboardingStatus) ??
    normalizeStatus(input.supabaseStatus)

  if (savedStatus) {
    return savedStatus
  }

  if (hasPregnancyTimingData(input)) {
    return 'pregnant'
  }

  return 'preparing'
}

export function isPreparingStatus(status: PregnancyStatus): boolean {
  return status === 'preparing'
}

export function isPregnantStatus(status: PregnancyStatus): boolean {
  return status === 'pregnant'
}

export function buildWifeSearchParams(input: {
  babyName?: string | null
  status: PregnancyStatus
  pregnancyWeek?: number | null
  fresh?: boolean
}): URLSearchParams {
  const params = new URLSearchParams({
    name: input.babyName?.trim() || '아기',
    status: input.status,
  })

  if (input.status === 'pregnant' && input.pregnancyWeek != null && input.pregnancyWeek > 0) {
    params.set('weeks', String(Math.round(input.pregnancyWeek)))
  }

  if (input.fresh) {
    params.set('fresh', 'true')
  }

  return params
}
