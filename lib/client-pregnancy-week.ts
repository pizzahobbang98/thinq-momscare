import { readOnboardingProfile } from '@/lib/onboarding-profile'
import {
  calculatePregnancyWeekFromDueDate,
  readPregnancyJourneyFromStorage,
} from '@/lib/pregnancy'
import { readWifeProfile } from '@/lib/wife-profile-storage'

export function resolveExplicitPregnancyWeek(options?: {
  urlWeeks?: number | null
  storedWeek?: number | null
  onboardingWeeks?: string | null
}) {
  const fromUrl =
    options?.urlWeeks != null && options.urlWeeks >= 1 && options.urlWeeks <= 42
      ? Math.round(options.urlWeeks)
      : null

  const fromStored =
    options?.storedWeek != null && options.storedWeek >= 1 && options.storedWeek <= 42
      ? Math.round(options.storedWeek)
      : null

  const onboardingRaw = options?.onboardingWeeks
  const fromOnboarding =
    onboardingRaw != null && Number.isFinite(Number(onboardingRaw))
      ? Math.round(Number(onboardingRaw))
      : null

  const journeyStored = readPregnancyJourneyFromStorage()?.week ?? null

  return fromUrl ?? fromStored ?? fromOnboarding ?? journeyStored
}

export function resolveClientPregnancyWeek(options?: {
  urlWeeks?: number | null
  dueDate?: string | null
}) {
  const stored = readWifeProfile()
  const onboarding = readOnboardingProfile()

  const explicit = resolveExplicitPregnancyWeek({
    urlWeeks: options?.urlWeeks,
    storedWeek: stored?.pregnancyWeek,
    onboardingWeeks: onboarding?.weeks ?? null,
  })

  if (explicit != null && explicit >= 1) {
    return explicit
  }

  if (options?.dueDate) {
    return calculatePregnancyWeekFromDueDate(options.dueDate)
  }

  return explicit
}
