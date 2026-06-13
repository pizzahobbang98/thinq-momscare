import type { DiaryEntry } from '@/lib/supabase'

export type DemoPregnancyStatus = 'preparing' | 'pregnant'
export type DemoRole = 'wife' | 'husband'
export type DemoCareState = 'idle' | 'processing' | 'completed'
export type PreparationMode =
  | 'condition'
  | 'sleep-rhythm'
  | 'stress-relief'
  | 'rest-ready'
  | 'walk-air'
  | 'couple-routine'

export type SharedDemoState = {
  pregnancyStatus: DemoPregnancyStatus
  pregnancyWeek: number
  role: DemoRole
  currentRoutine: string | null
  simulationRoutine: string | null
  preparationMode: PreparationMode
  careState: DemoCareState
  careUpdatedAt: string | null
  diaryEntries: DiaryEntry[]
  lastUpdated: string
}

export const DEFAULT_SHARED_DEMO_STATE: SharedDemoState = {
  pregnancyStatus: 'pregnant',
  pregnancyWeek: 16,
  role: 'wife',
  currentRoutine: null,
  simulationRoutine: null,
  preparationMode: 'condition',
  careState: 'idle',
  careUpdatedAt: null,
  diaryEntries: [],
  lastUpdated: new Date(0).toISOString(),
}

export function isDemoPregnancyStatus(value: unknown): value is DemoPregnancyStatus {
  return value === 'preparing' || value === 'pregnant'
}

export function normalizeDemoPregnancyWeek(value: unknown, fallback = 16) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(42, Math.max(1, Math.round(value)))
    : fallback
}

export function isDemoRole(value: unknown): value is DemoRole {
  return value === 'wife' || value === 'husband'
}

export function isDemoCareState(value: unknown): value is DemoCareState {
  return value === 'idle' || value === 'processing' || value === 'completed'
}

export function isPreparationMode(value: unknown): value is PreparationMode {
  return (
    value === 'condition' ||
    value === 'sleep-rhythm' ||
    value === 'stress-relief' ||
    value === 'rest-ready' ||
    value === 'walk-air' ||
    value === 'couple-routine'
  )
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
