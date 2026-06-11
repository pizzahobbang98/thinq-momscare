import type { CareInterest, PregnancyStatus } from '@/lib/pregnancy-status'

export const WIFE_PROFILE_STORAGE_KEY = 'thinq-mom-wife-profile'

export type WifeProfileData = {
  userLabel: string
  babyName: string
  pregnancyStatus: PregnancyStatus | null
  pregnancyWeek: number | null
  pregnancyDay: number | null
  dueDate: string | null
  preparationStartDate: string | null
  postpartumDate: string | null
  spouseConnected: boolean
  careInterests: CareInterest[]
}

const DEFAULT_CARE_INTERESTS: CareInterest[] = ['수면 리듬', '실내 공기', '병원 일정']

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function normalizeCareInterests(value: unknown): CareInterest[] {
  if (!Array.isArray(value)) return DEFAULT_CARE_INTERESTS
  const allowed = new Set<string>([
    '수면 리듬',
    '실내 공기',
    '식사 루틴',
    '병원 일정',
    '마음 기록',
  ])
  const filtered = value.filter((item): item is CareInterest => typeof item === 'string' && allowed.has(item))
  return filtered.length > 0 ? filtered : DEFAULT_CARE_INTERESTS
}

function normalizePregnancyStatus(value: unknown): PregnancyStatus | null {
  if (value === 'preparing' || value === 'pregnant' || value === 'postpartum') {
    return value
  }
  return null
}

export function mergeWifeProfile(
  base: WifeProfileData,
  patch: Partial<WifeProfileData>,
): WifeProfileData {
  const merged: WifeProfileData = { ...base }

  if (patch.userLabel !== undefined) merged.userLabel = patch.userLabel
  if (patch.babyName !== undefined) merged.babyName = patch.babyName
  if (patch.pregnancyStatus !== undefined) merged.pregnancyStatus = patch.pregnancyStatus
  if (patch.pregnancyWeek !== undefined) merged.pregnancyWeek = patch.pregnancyWeek
  if (patch.pregnancyDay !== undefined) merged.pregnancyDay = patch.pregnancyDay
  if (patch.dueDate !== undefined) merged.dueDate = patch.dueDate
  if (patch.preparationStartDate !== undefined) merged.preparationStartDate = patch.preparationStartDate
  if (patch.postpartumDate !== undefined) merged.postpartumDate = patch.postpartumDate
  if (patch.spouseConnected !== undefined) merged.spouseConnected = patch.spouseConnected
  if (patch.careInterests !== undefined) merged.careInterests = patch.careInterests

  return merged
}

export function readWifeProfile(): WifeProfileData | null {
  try {
    const storage = getStorage()
    if (!storage) return null

    const raw = storage.getItem(WIFE_PROFILE_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<WifeProfileData>
    if (!parsed.userLabel) return null

    return {
      userLabel: parsed.userLabel,
      babyName: parsed.babyName ?? '',
      pregnancyStatus: normalizePregnancyStatus(parsed.pregnancyStatus),
      pregnancyWeek:
        parsed.pregnancyWeek != null && Number.isFinite(parsed.pregnancyWeek)
          ? Math.round(parsed.pregnancyWeek)
          : null,
      pregnancyDay:
        parsed.pregnancyDay != null && Number.isFinite(parsed.pregnancyDay)
          ? Math.min(6, Math.max(0, Math.round(parsed.pregnancyDay)))
          : null,
      dueDate: parsed.dueDate ?? null,
      preparationStartDate: parsed.preparationStartDate ?? null,
      postpartumDate: parsed.postpartumDate ?? null,
      spouseConnected: parsed.spouseConnected ?? true,
      careInterests: normalizeCareInterests(parsed.careInterests),
    }
  } catch (error) {
    console.warn('[wife-profile] read failed:', error)
    return null
  }
}

export function saveWifeProfile(profile: WifeProfileData): boolean {
  try {
    const storage = getStorage()
    if (!storage) return false
    storage.setItem(WIFE_PROFILE_STORAGE_KEY, JSON.stringify(profile))
    return true
  } catch (error) {
    console.warn('[wife-profile] save failed:', error)
    return false
  }
}

export function buildDefaultWifeProfile(options: {
  babyName?: string | null
  pregnancyStatus?: PregnancyStatus | null
  pregnancyWeek?: number | null
  pregnancyDay?: number | null
  dueDate?: string | null
  preparationStartDate?: string | null
}): WifeProfileData {
  return {
    userLabel: '아내',
    babyName: options.babyName?.trim() ?? '',
    pregnancyStatus: options.pregnancyStatus ?? null,
    pregnancyWeek:
      options.pregnancyWeek != null && options.pregnancyWeek > 0
        ? Math.round(options.pregnancyWeek)
        : null,
    pregnancyDay:
      options.pregnancyDay != null && options.pregnancyDay >= 0
        ? Math.min(6, Math.max(0, Math.round(options.pregnancyDay)))
        : null,
    dueDate: options.dueDate ?? null,
    preparationStartDate: options.preparationStartDate ?? null,
    postpartumDate: null,
    spouseConnected: true,
    careInterests: DEFAULT_CARE_INTERESTS,
  }
}
