export const PREPARATION_CYCLE_PROFILE_KEY = 'thinq-mom-preparation-cycle-profile'

export type PreparationCycleProfile = {
  lastPeriodStartDate: string
  cycleLength: number
  // 임신중일 때의 임신 시작일(LMP). 비어 있으면 주차에서 추정합니다.
  pregnancyStartDate: string
}

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function getKoreaTodayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function normalizeCycleLength(value: unknown, fallback = 28) {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(40, Math.max(21, Math.round(numeric)))
}

export function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function getDefaultPreparationCycleProfile(date = new Date()): PreparationCycleProfile {
  return {
    lastPeriodStartDate: getKoreaTodayKey(date),
    cycleLength: 28,
    pregnancyStartDate: '',
  }
}

export function normalizePreparationCycleProfile(
  value: Partial<PreparationCycleProfile> | null | undefined,
  fallback: PreparationCycleProfile = getDefaultPreparationCycleProfile(),
): PreparationCycleProfile {
  return {
    lastPeriodStartDate: isDateKey(value?.lastPeriodStartDate)
      ? value.lastPeriodStartDate
      : fallback.lastPeriodStartDate,
    cycleLength: normalizeCycleLength(value?.cycleLength, fallback.cycleLength),
    pregnancyStartDate: isDateKey(value?.pregnancyStartDate)
      ? value.pregnancyStartDate
      : fallback.pregnancyStartDate ?? '',
  }
}

export function readPreparationCycleProfile(): PreparationCycleProfile {
  const fallback = getDefaultPreparationCycleProfile()
  try {
    const storage = getStorage()
    if (!storage) return fallback

    const raw = storage.getItem(PREPARATION_CYCLE_PROFILE_KEY)
    if (!raw) return fallback

    return normalizePreparationCycleProfile(JSON.parse(raw) as Partial<PreparationCycleProfile>, fallback)
  } catch (error) {
    console.warn('[preparation-cycle-profile] read failed:', error)
    return fallback
  }
}

export function savePreparationCycleProfile(profile: PreparationCycleProfile) {
  const normalized = normalizePreparationCycleProfile(profile)
  try {
    const storage = getStorage()
    if (!storage) return normalized

    storage.setItem(PREPARATION_CYCLE_PROFILE_KEY, JSON.stringify(normalized))
  } catch (error) {
    console.warn('[preparation-cycle-profile] save failed:', error)
  }
  return normalized
}
