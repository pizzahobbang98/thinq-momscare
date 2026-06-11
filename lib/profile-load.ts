import type { SupabaseClient } from '@supabase/supabase-js'
import { warnRecoverableError } from '@/lib/log-error'
import {
  getFallbackPregnancyProfile,
  savePregnancyJourneyToStorage,
  type FallbackPregnancyProfile,
} from '@/lib/pregnancy'
import type { WifeProfileData } from '@/lib/wife-profile-storage'
import { buildDefaultWifeProfile, mergeWifeProfile } from '@/lib/wife-profile-storage'

export type WifeSupabaseProfileRow = {
  due_date: string | null
  status: string | null
  name: string | null
}

export type WifeSupabaseProfileResult = {
  profile: WifeSupabaseProfileRow | null
  failed: boolean
}

export async function fetchWifeSupabaseProfile(
  supabase: SupabaseClient,
): Promise<WifeSupabaseProfileResult> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('due_date, name')
      .eq('role', 'wife')
      .maybeSingle()

    if (error) {
      warnRecoverableError('Supabase wife profile query failed, using fallback profile', error)
      return { profile: null, failed: true }
    }

    if (!data) {
      return { profile: null, failed: false }
    }

    return {
      profile: {
        due_date: data.due_date,
        status: data.due_date ? 'pregnant' : 'preparing',
        name: data.name,
      },
      failed: false,
    }
  } catch (error) {
    warnRecoverableError('Supabase wife profile query threw, using fallback profile', error)
    return { profile: null, failed: true }
  }
}

export function applyPregnancyProfileFallback(
  profile: WifeProfileData,
  fallback: FallbackPregnancyProfile = getFallbackPregnancyProfile(),
): WifeProfileData {
  return mergeWifeProfile(profile, {
    babyName: profile.babyName?.trim() ? profile.babyName : fallback.babyNickname,
    pregnancyWeek:
      profile.pregnancyWeek != null && profile.pregnancyWeek >= 0
        ? profile.pregnancyWeek
        : fallback.pregnancyWeek,
  })
}

export function ensurePregnancyJourneyStorage(profile: WifeProfileData) {
  if (profile.pregnancyStatus !== 'pregnant') return

  savePregnancyJourneyToStorage({
    week: profile.pregnancyWeek ?? getFallbackPregnancyProfile().pregnancyWeek,
    nickname: profile.babyName || undefined,
  })
}

export function buildWifeProfileWithFallback(
  base: WifeProfileData | null,
  patch: Partial<WifeProfileData>,
): WifeProfileData {
  const merged = mergeWifeProfile(
    base ?? buildDefaultWifeProfile({}),
    patch,
  )
  return applyPregnancyProfileFallback(merged)
}
