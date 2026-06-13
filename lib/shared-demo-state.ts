import type { DiaryEntry } from '@/lib/supabase'

export type DemoPregnancyStatus = 'preparing' | 'pregnant'
export type DemoRole = 'wife' | 'husband'
export type DemoCareState = 'idle' | 'processing' | 'completed'

export type SharedDemoState = {
  pregnancyStatus: DemoPregnancyStatus
  role: DemoRole
  currentRoutine: string | null
  careState: DemoCareState
  diaryEntries: DiaryEntry[]
  lastUpdated: string
}

export const DEFAULT_SHARED_DEMO_STATE: SharedDemoState = {
  pregnancyStatus: 'pregnant',
  role: 'wife',
  currentRoutine: null,
  careState: 'idle',
  diaryEntries: [],
  lastUpdated: new Date(0).toISOString(),
}

export function isDemoPregnancyStatus(value: unknown): value is DemoPregnancyStatus {
  return value === 'preparing' || value === 'pregnant'
}

export function isDemoRole(value: unknown): value is DemoRole {
  return value === 'wife' || value === 'husband'
}

export function isDemoCareState(value: unknown): value is DemoCareState {
  return value === 'idle' || value === 'processing' || value === 'completed'
}

export function normalizeDiaryEntries(value: unknown): DiaryEntry[] {
  if (!Array.isArray(value)) return []

  return value.filter((entry): entry is DiaryEntry => {
    if (!entry || typeof entry !== 'object') return false
    const candidate = entry as Partial<DiaryEntry>
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.title === 'string' &&
      typeof candidate.content === 'string' &&
      typeof candidate.created_at === 'string'
    )
  })
}
