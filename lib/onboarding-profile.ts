export type OnboardingRole = 'wife' | 'husband'

export type OnboardingStatus = 'preparing' | 'pregnant'

export type OnboardingProfile = {
  babyName: string
  status: OnboardingStatus
  weeks?: string
  pregnancyDay?: string
  birthDate: string
  role: OnboardingRole
}

export const ONBOARDING_STORAGE_KEYS = {
  profile: 'thinq-mom-onboarding-profile',
  role: 'thinq-mom-role',
  birthDate: 'thinq-mom-birth-date',
} as const

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function saveOnboardingProfile(profile: OnboardingProfile) {
  try {
    const storage = getStorage()
    if (!storage) return

    storage.setItem(ONBOARDING_STORAGE_KEYS.profile, JSON.stringify(profile))
    storage.setItem(ONBOARDING_STORAGE_KEYS.role, profile.role)
    storage.setItem(ONBOARDING_STORAGE_KEYS.birthDate, profile.birthDate)
  } catch (error) {
    console.warn('[onboarding-profile] localStorage save failed:', error)
  }
}

export function readOnboardingProfile(): OnboardingProfile | null {
  try {
    const storage = getStorage()
    if (!storage) return null

    const raw = storage.getItem(ONBOARDING_STORAGE_KEYS.profile)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<OnboardingProfile>
      if (
        parsed.babyName &&
        parsed.status &&
        parsed.birthDate &&
        (parsed.role === 'wife' || parsed.role === 'husband')
      ) {
        return {
          babyName: parsed.babyName,
          status: parsed.status,
          weeks: parsed.weeks,
          pregnancyDay: parsed.pregnancyDay,
          birthDate: parsed.birthDate,
          role: parsed.role,
        }
      }
    }

    const role = storage.getItem(ONBOARDING_STORAGE_KEYS.role)
    if (role !== 'wife' && role !== 'husband') return null

    // 역할만 남은 경우 status를 preparing으로 추정하지 않음
    return null
  } catch (error) {
    console.warn('[onboarding-profile] localStorage read failed:', error)
    return null
  }
}

export function resolveOnboardingRole(
  roleParam: string | null | undefined,
): OnboardingRole | null {
  if (roleParam === 'wife' || roleParam === 'husband') return roleParam

  const profile = readOnboardingProfile()
  if (profile?.role) return profile.role

  try {
    const storage = getStorage()
    const role = storage?.getItem(ONBOARDING_STORAGE_KEYS.role)
    if (role === 'wife' || role === 'husband') return role
  } catch {
    return null
  }

  return null
}
