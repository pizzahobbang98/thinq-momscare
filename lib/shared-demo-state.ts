import type { DiaryEntry } from '@/lib/supabase'
import { DEFAULT_LIGHT_COLOR } from '@/lib/light-control'

export type DemoPregnancyStatus = 'preparing' | 'pregnant'
export type DemoRole = 'wife' | 'husband'
export type DemoCareState = 'idle' | 'processing' | 'completed'
export type DemoLightPower = 'on' | 'off'
export type PreparationMode =
  | 'condition'
  | 'sleep-rhythm'
  | 'refresh'
  | 'rest-ready'
  | 'couple-routine'

export type SharedDemoVoiceCommand = {
  id: string
  transcript: string
  result: Record<string, unknown>
  source: string
  deviceHandled: boolean
  createdAt: string
}

export type SharedDemoModeState = {
  mode: string | null
  routine: string | null
  label: string | null
  source: string | null
  updatedAt: string | null
}

export type SharedDemoUserState = {
  pregnancyStatus: DemoPregnancyStatus
  role: DemoRole
  pregnancyWeek: number
  babyName: string
  source: string | null
  updatedAt: string | null
}

export type SharedDemoHubListeningState = {
  listening: boolean
  source: string | null
  updatedAt: string | null
}

export type SharedDemoState = {
  pregnancyStatus: DemoPregnancyStatus
  pregnancyWeek: number
  role: DemoRole
  babyName: string
  userState: SharedDemoUserState | null
  currentRoutine: string | null
  simulationRoutine: string | null
  demoMode: SharedDemoModeState | null
  latestHubInput: string | null
  latestCareModeLabel: string | null
  latestVoiceCommand: SharedDemoVoiceCommand | null
  hubListening: SharedDemoHubListeningState | null
  preparationMode: PreparationMode
  lightPower: DemoLightPower
  lightColor: string | null
  careState: DemoCareState
  careUpdatedAt: string | null
  diaryEntries: DiaryEntry[]
  lastUpdated: string
}

export const DEFAULT_SHARED_DEMO_STATE: SharedDemoState = {
  pregnancyStatus: 'pregnant',
  pregnancyWeek: 16,
  role: 'wife',
  babyName: '아기',
  userState: null,
  currentRoutine: null,
  simulationRoutine: null,
  demoMode: null,
  latestHubInput: null,
  latestCareModeLabel: null,
  latestVoiceCommand: null,
  hubListening: null,
  preparationMode: 'condition',
  lightPower: 'on',
  lightColor: DEFAULT_LIGHT_COLOR,
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

export function normalizeDemoBabyName(value: unknown, fallback = '아기') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export function isDemoRole(value: unknown): value is DemoRole {
  return value === 'wife' || value === 'husband'
}

export function isDemoCareState(value: unknown): value is DemoCareState {
  return value === 'idle' || value === 'processing' || value === 'completed'
}

export function isDemoLightPower(value: unknown): value is DemoLightPower {
  return value === 'on' || value === 'off'
}

export function isPreparationMode(value: unknown): value is PreparationMode {
  return (
    value === 'condition' ||
    value === 'sleep-rhythm' ||
    value === 'refresh' ||
    value === 'rest-ready' ||
    value === 'couple-routine'
  )
}

export function normalizePreparationMode(value: unknown): PreparationMode {
  if (value === 'stress-relief' || value === 'walk-air') return 'refresh'
  return isPreparationMode(value) ? value : DEFAULT_SHARED_DEMO_STATE.preparationMode
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function normalizeLightColor(value: unknown, fallback: string | null): string | null {
  if (value === null) return null
  if (typeof value !== 'string') return fallback

  const trimmed = value.trim()
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toUpperCase() : fallback
}

export function normalizeSharedDemoModeState(value: unknown): SharedDemoModeState | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Partial<SharedDemoModeState>
  const updatedAt = nullableString(candidate.updatedAt)
  if (!updatedAt) return null

  return {
    mode: nullableString(candidate.mode),
    routine: nullableString(candidate.routine),
    label: nullableString(candidate.label),
    source: nullableString(candidate.source),
    updatedAt,
  }
}

export function normalizeSharedDemoUserState(
  value: unknown,
  fallback: SharedDemoUserState | null = null,
): SharedDemoUserState | null {
  if (!value || typeof value !== 'object') return fallback

  const candidate = value as Partial<SharedDemoUserState>
  const pregnancyStatus = isDemoPregnancyStatus(candidate.pregnancyStatus)
    ? candidate.pregnancyStatus
    : fallback?.pregnancyStatus ?? DEFAULT_SHARED_DEMO_STATE.pregnancyStatus
  const role = isDemoRole(candidate.role)
    ? candidate.role
    : fallback?.role ?? DEFAULT_SHARED_DEMO_STATE.role

  return {
    pregnancyStatus,
    role,
    pregnancyWeek: normalizeDemoPregnancyWeek(
      candidate.pregnancyWeek,
      fallback?.pregnancyWeek ?? DEFAULT_SHARED_DEMO_STATE.pregnancyWeek,
    ),
    babyName: normalizeDemoBabyName(
      candidate.babyName,
      fallback?.babyName ?? DEFAULT_SHARED_DEMO_STATE.babyName,
    ),
    source: nullableString(candidate.source),
    updatedAt: nullableString(candidate.updatedAt),
  }
}

export function normalizeSharedDemoVoiceCommand(value: unknown): SharedDemoVoiceCommand | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Partial<SharedDemoVoiceCommand>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.transcript !== 'string' ||
    !candidate.result ||
    typeof candidate.result !== 'object' ||
    typeof candidate.source !== 'string' ||
    typeof candidate.createdAt !== 'string'
  ) {
    return null
  }

  return {
    id: candidate.id,
    transcript: candidate.transcript,
    result: candidate.result as Record<string, unknown>,
    source: candidate.source,
    deviceHandled: candidate.deviceHandled === true,
    createdAt: candidate.createdAt,
  }
}

export function normalizeSharedDemoHubListeningState(value: unknown): SharedDemoHubListeningState | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Partial<SharedDemoHubListeningState>
  const updatedAt = nullableString(candidate.updatedAt)
  if (!updatedAt) return null

  return {
    listening: candidate.listening === true,
    source: nullableString(candidate.source),
    updatedAt,
  }
}

export function normalizeSharedDemoState(
  value: unknown,
  fallback: SharedDemoState = DEFAULT_SHARED_DEMO_STATE,
): SharedDemoState {
  const candidate = value && typeof value === 'object' ? value as Partial<SharedDemoState> : {}
  const candidateUserState = normalizeSharedDemoUserState(candidate.userState)
  const pregnancyStatus = isDemoPregnancyStatus(candidate.pregnancyStatus)
    ? candidate.pregnancyStatus
    : candidateUserState?.pregnancyStatus ?? fallback.pregnancyStatus
  const role = isDemoRole(candidate.role) ? candidate.role : candidateUserState?.role ?? fallback.role
  const pregnancyWeek = normalizeDemoPregnancyWeek(
    candidate.pregnancyWeek ?? candidateUserState?.pregnancyWeek,
    fallback.pregnancyWeek,
  )
  const babyName = normalizeDemoBabyName(
    candidate.babyName ?? candidateUserState?.babyName,
    fallback.babyName,
  )
  const lastUpdated = typeof candidate.lastUpdated === 'string'
    ? candidate.lastUpdated
    : fallback.lastUpdated
  const fallbackUserState: SharedDemoUserState = {
    pregnancyStatus,
    role,
    pregnancyWeek,
    babyName,
    source: fallback.userState?.source ?? null,
    updatedAt: lastUpdated,
  }

  return {
    pregnancyStatus,
    pregnancyWeek,
    role,
    babyName,
    userState: normalizeSharedDemoUserState(candidate.userState, fallbackUserState),
    currentRoutine: candidate.currentRoutine === null || typeof candidate.currentRoutine === 'string'
      ? candidate.currentRoutine
      : fallback.currentRoutine,
    simulationRoutine: candidate.simulationRoutine === null || typeof candidate.simulationRoutine === 'string'
      ? candidate.simulationRoutine
      : fallback.simulationRoutine,
    demoMode: candidate.demoMode === null
      ? null
      : normalizeSharedDemoModeState(candidate.demoMode) ?? fallback.demoMode,
    latestHubInput: candidate.latestHubInput === null || typeof candidate.latestHubInput === 'string'
      ? candidate.latestHubInput
      : fallback.latestHubInput,
    latestCareModeLabel: candidate.latestCareModeLabel === null || typeof candidate.latestCareModeLabel === 'string'
      ? candidate.latestCareModeLabel
      : fallback.latestCareModeLabel,
    latestVoiceCommand: candidate.latestVoiceCommand === undefined
      ? fallback.latestVoiceCommand
      : normalizeSharedDemoVoiceCommand(candidate.latestVoiceCommand),
    hubListening: candidate.hubListening === undefined
      ? fallback.hubListening
      : normalizeSharedDemoHubListeningState(candidate.hubListening),
    preparationMode: candidate.preparationMode === undefined
      ? fallback.preparationMode
      : normalizePreparationMode(candidate.preparationMode),
    lightPower: candidate.lightPower === undefined
      ? fallback.lightPower
      : isDemoLightPower(candidate.lightPower)
        ? candidate.lightPower
        : fallback.lightPower,
    lightColor: candidate.lightColor === undefined
      ? fallback.lightColor
      : normalizeLightColor(candidate.lightColor, fallback.lightColor),
    careState: isDemoCareState(candidate.careState) ? candidate.careState : fallback.careState,
    careUpdatedAt: candidate.careUpdatedAt === null || typeof candidate.careUpdatedAt === 'string'
      ? candidate.careUpdatedAt
      : fallback.careUpdatedAt,
    diaryEntries: candidate.diaryEntries === undefined
      ? fallback.diaryEntries
      : normalizeDiaryEntries(candidate.diaryEntries),
    lastUpdated,
  }
}

export function normalizeDiaryEntries(value: unknown): DiaryEntry[] {
  if (!Array.isArray(value)) return []

  return value.filter((entry): entry is DiaryEntry => {
    if (!entry || typeof entry !== 'object') return false
    const candidate = entry as Partial<DiaryEntry>
    const hasRequiredFields = (
      typeof candidate.id === 'string' &&
      typeof candidate.title === 'string' &&
      typeof candidate.content === 'string' &&
      typeof candidate.created_at === 'string'
    )
    if (!hasRequiredFields) return false

    const visibleText = [candidate.title, candidate.content, candidate.summary]
      .filter((text): text is string => typeof text === 'string')

    return visibleText.every((text) => !text.includes('\uFFFD'))
  })
}
