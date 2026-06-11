import { readOnboardingProfile } from '@/lib/onboarding-profile'
import { buildWifeSearchParams, resolvePregnancyStatus } from '@/lib/pregnancy-status'
import { readWifeProfile } from '@/lib/wife-profile-storage'

export function buildSelectQueryString(existingQuery?: string | null): string {
  const onboarding = readOnboardingProfile()
  const wifeProfile = readWifeProfile()
  const existingParams = existingQuery?.trim() ? new URLSearchParams(existingQuery) : null

  const weeksParam = existingParams?.get('weeks') ?? onboarding?.weeks ?? null
  const parsedWeeksFromParam =
    weeksParam && Number.isFinite(Number(weeksParam)) ? Number(weeksParam) : null
  const pregnancyWeek = wifeProfile?.pregnancyWeek ?? parsedWeeksFromParam

  const status = resolvePregnancyStatus({
    profileStatus: wifeProfile?.pregnancyStatus,
    onboardingStatus: onboarding?.status,
    urlStatus: existingParams?.get('status'),
    pregnancyWeek,
    dueDate: wifeProfile?.dueDate,
    weeksParam,
  })

  const params = buildWifeSearchParams({
    babyName:
      existingParams?.get('name') ?? wifeProfile?.babyName ?? onboarding?.babyName,
    status,
    pregnancyWeek,
    fresh: existingParams?.get('fresh') === 'true',
  })

  if (onboarding?.role) {
    params.set('role', onboarding.role)
  } else if (existingParams?.get('role')) {
    params.set('role', existingParams.get('role')!)
  }

  if (onboarding?.birthDate) {
    params.set('birthDate', onboarding.birthDate)
  } else if (existingParams?.get('birthDate')) {
    params.set('birthDate', existingParams.get('birthDate')!)
  }

  return params.toString()
}

export function buildWifeUrl(existingQuery?: string | null): string {
  return `/wife?${buildSelectQueryString(existingQuery)}`
}

export function buildSelectUrl(existingQuery?: string | null): string {
  return `/select?${buildSelectQueryString(existingQuery)}`
}
