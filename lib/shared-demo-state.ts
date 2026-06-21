import type { DiaryEntry } from '@/lib/supabase'

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
  sourceScreen?: string
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
  cycleLength?: number
  lastPeriodStartDate?: string
  pregnancyStartDate?: string
  motherName?: string
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
  preparationMode: PreparationMode
  lightPower: DemoLightPower
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
  preparationMode: 'condition',
  lightPower: 'on',
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

export function normalizeDemoCycleLength(value: unknown, fallback = 28) {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(99, Math.max(1, Math.round(numeric)))
}

function normalizeDateKey(value: unknown): string | undefined {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined
}

function normalizeOptionalLabel(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 20) : undefined
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
    cycleLength:
      candidate.cycleLength !== undefined || fallback?.cycleLength !== undefined
        ? normalizeDemoCycleLength(candidate.cycleLength, fallback?.cycleLength ?? 28)
        : undefined,
    lastPeriodStartDate:
      normalizeDateKey(candidate.lastPeriodStartDate) ?? fallback?.lastPeriodStartDate,
    pregnancyStartDate:
      normalizeDateKey(candidate.pregnancyStartDate) ?? fallback?.pregnancyStartDate,
    motherName: normalizeOptionalLabel(candidate.motherName) ?? fallback?.motherName,
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
    sourceScreen: typeof candidate.sourceScreen === 'string' ? candidate.sourceScreen : undefined,
    deviceHandled: candidate.deviceHandled === true,
    createdAt: candidate.createdAt,
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
    preparationMode: candidate.preparationMode === undefined
      ? fallback.preparationMode
      : normalizePreparationMode(candidate.preparationMode),
    lightPower: candidate.lightPower === undefined
      ? fallback.lightPower
      : isDemoLightPower(candidate.lightPower)
        ? candidate.lightPower
        : fallback.lightPower,
    careState: isDemoCareState(candidate.careState) ? candidate.careState : fallback.careState,
    careUpdatedAt: candidate.careUpdatedAt === null || typeof candidate.careUpdatedAt === 'string'
      ? candidate.careUpdatedAt
      : fallback.careUpdatedAt,
    diaryEntries: candidate.diaryEntries === undefined
      ? dedupeDiaryEntriesByContextDate(fallback.diaryEntries)
      : dedupeDiaryEntriesByContextDate(normalizeDiaryEntries(candidate.diaryEntries)),
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

type DiarySourceSummary = {
  pregnancyStatus?: unknown
  role?: unknown
  diaryDate?: unknown
  source?: unknown
  generatedBy?: unknown
  createdByAction?: unknown
  isSeed?: unknown
  isAutoGenerated?: unknown
}

function parseDiarySourceSummary(entry: DiaryEntry): DiarySourceSummary {
  try {
    return entry.source_summary ? JSON.parse(entry.source_summary) as DiarySourceSummary : {}
  } catch {
    return {}
  }
}

function formatKoreaDateKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)
      ? value.slice(0, 10)
      : ''
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return year && month && day ? `${year}-${month}-${day}` : date.toISOString().slice(0, 10)
}

export function getDiaryEntryDateKey(entry: DiaryEntry) {
  const source = parseDiarySourceSummary(entry)
  return typeof source.diaryDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source.diaryDate)
    ? source.diaryDate
    : formatKoreaDateKey(entry.created_at)
}

export function getDiaryEntryContext(entry: DiaryEntry): {
  pregnancyStatus: DemoPregnancyStatus
  role: DemoRole
} {
  const source = parseDiarySourceSummary(entry)
  const usedModes = Array.isArray(entry.used_modes)
    ? entry.used_modes
    : typeof entry.used_modes === 'string'
      ? [entry.used_modes]
      : []
  const preparing =
    source.pregnancyStatus === 'preparing' ||
    entry.id.startsWith('preparing-') ||
    usedModes.includes('PREPARING_ROUTINE') ||
    entry.source_summary?.includes('임신 준비') === true ||
    entry.source_summary?.includes('"pregnancyStatus":"preparing"') === true
  const role = source.role === 'husband' || entry.id.includes('-husband-')
    ? 'husband'
    : 'wife'

  return {
    pregnancyStatus: preparing ? 'preparing' : 'pregnant',
    role,
  }
}

export function getDiaryEntryDedupeKey(entry: DiaryEntry) {
  const context = getDiaryEntryContext(entry)
  return [
    context.pregnancyStatus,
    context.role,
    getDiaryEntryDateKey(entry),
  ].join(':')
}

const PREPARING_FORBIDDEN_DIARY_TERMS = [
  '태아',
  '임신 주차',
  '16주',
  '초음파',
  '입덧',
  '태동',
  '출산',
  '산모',
]

function diaryTextIncludesPreparingForbiddenTerm(entry: DiaryEntry) {
  const usedModes = Array.isArray(entry.used_modes)
    ? entry.used_modes.join(' ')
    : entry.used_modes ?? ''
  const text = [
    entry.title,
    entry.content,
    entry.summary ?? '',
    usedModes,
    entry.source_summary ?? '',
  ].join('\n')
  return PREPARING_FORBIDDEN_DIARY_TERMS.some((term) => text.includes(term))
}

export function shouldKeepDiaryEntry(entry: DiaryEntry) {
  const source = parseDiarySourceSummary(entry)
  const context = getDiaryEntryContext(entry)
  const action = typeof source.createdByAction === 'string' ? source.createdByAction : null
  const sourceName = typeof source.source === 'string' ? source.source : null
  const generatedBy = typeof source.generatedBy === 'string' ? source.generatedBy : null
  const isSeed = source.isSeed === true || entry.is_seed === true
  const isAutomatic =
    source.isAutoGenerated === true ||
    entry.is_auto_generated === true ||
    sourceName === 'seed' ||
    sourceName === 'mock' ||
    sourceName === 'demo_seed' ||
    generatedBy === 'seed' ||
    generatedBy === 'mock'

  if (isSeed || (isAutomatic && action !== 'manual_update')) return false
  if (context.pregnancyStatus === 'preparing' && diaryTextIncludesPreparingForbiddenTerm(entry)) {
    return false
  }

  return true
}

export function dedupeDiaryEntriesByContextDate(entries: DiaryEntry[]) {
  const sorted = entries
    .filter(shouldKeepDiaryEntry)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  const deduped = new Map<string, DiaryEntry>()

  for (const entry of sorted) {
    const key = getDiaryEntryDedupeKey(entry)
    if (!key.endsWith(':') && !deduped.has(key)) deduped.set(key, entry)
  }

  return Array.from(deduped.values())
}
