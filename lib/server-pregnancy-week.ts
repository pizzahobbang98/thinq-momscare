import type { SupabaseClient } from '@supabase/supabase-js'
import { calculatePregnancyWeekFromDueDate } from '@/lib/pregnancy'

export function isValidPregnancyWeek(weeks: unknown): weeks is number {
  return (
    typeof weeks === 'number' &&
    Number.isInteger(weeks) &&
    weeks >= 1 &&
    weeks <= 42
  )
}

export async function fetchWifeDueDateFromSupabase(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('users')
    .select('due_date')
    .eq('role', 'wife')
    .maybeSingle()

  if (error) {
    throw new Error(`users 조회 실패: ${error.message}`)
  }

  return data?.due_date ?? null
}

export function resolvePregnancyWeekFromDueDate(dueDate: string | null) {
  if (!dueDate) return null
  return calculatePregnancyWeekFromDueDate(dueDate)
}

export async function resolveServerPregnancyWeek(
  supabase: SupabaseClient,
  options?: { weeks?: number },
) {
  if (isValidPregnancyWeek(options?.weeks)) {
    return {
      weeksPregnant: options.weeks,
      dueDate: null as string | null,
    }
  }

  const dueDate = await fetchWifeDueDateFromSupabase(supabase)
  const weeksPregnant = resolvePregnancyWeekFromDueDate(dueDate)

  if (weeksPregnant == null) {
    throw new Error('wife 유저 due_date가 없습니다.')
  }

  return { weeksPregnant, dueDate }
}
