export const WIFE_PROFILE_STORAGE_KEY = 'thinq-mom-wife-profile'

export type WifeProfileData = {
  userLabel: string
  babyName: string
  pregnancyWeek: number | null
  dueDate: string | null
  spouseConnected: boolean
}

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
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
      pregnancyWeek:
        parsed.pregnancyWeek != null && Number.isFinite(parsed.pregnancyWeek)
          ? Math.round(parsed.pregnancyWeek)
          : null,
      dueDate: parsed.dueDate ?? null,
      spouseConnected: parsed.spouseConnected ?? true,
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
  pregnancyWeek?: number | null
  dueDate?: string | null
}): WifeProfileData {
  return {
    userLabel: '아내',
    babyName: options.babyName?.trim() ?? '',
    pregnancyWeek:
      options.pregnancyWeek != null && options.pregnancyWeek > 0
        ? Math.round(options.pregnancyWeek)
        : null,
    dueDate: options.dueDate ?? null,
    spouseConnected: true,
  }
}
