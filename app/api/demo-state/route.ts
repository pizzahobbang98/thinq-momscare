import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { hubModeToSimulationRoutine } from '@/lib/simulation-routine-bridge'
import {
  DEFAULT_SHARED_DEMO_STATE,
  isDemoCareState,
  isDemoLightPower,
  isDemoPregnancyStatus,
  isDemoRole,
  normalizeDemoBabyName,
  normalizePreparationMode,
  normalizeDemoPregnancyWeek,
  normalizeDiaryEntries,
  normalizeSharedDemoModeState,
  normalizeSharedDemoHubListeningState,
  normalizeSharedDemoUserState,
  normalizeSharedDemoVoiceCommand,
  type SharedDemoModeState,
  type SharedDemoUserState,
  type SharedDemoState,
} from '@/lib/shared-demo-state'
import type { DiaryEntry } from '@/lib/supabase'

const CARE_SOURCES = [
  'hub_voice',
  'hub_text',
  'voice',
  'text',
  'hub',
  'example_chip',
  'example_chip_mobile',
  'mobile_hub_voice',
  'mobile_manual',
  'mobile_manual_chip',
]
const STATE_SOURCE = 'demo_state'
const STATE_MODE = 'DEMO_STATE'

type ModeRunRow = {
  id: string
  mode: string
  mode_label: string | null
  input_text: string | null
  reply: string | null
  wife_card: string | null
  source: string | null
  signals: unknown
  created_at: string
}

function careMatchesSnapshot(care: ModeRunRow, snapshot: SharedDemoState) {
  const signals = Array.isArray(care.signals)
    ? care.signals.filter((signal): signal is string => typeof signal === 'string')
    : []
  return (
    signals.includes(`상태:${snapshot.pregnancyStatus}`)
    && signals.includes(`역할:${snapshot.role}`)
  )
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key ? createClient(url, key) : null
}

function noStore<T>(body: T, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}

function buildDemoModeState(input: {
  mode?: string | null
  routine?: string | null
  label?: string | null
  source?: string | null
  updatedAt?: string | null
}): SharedDemoModeState {
  return {
    mode: input.mode?.trim() || null,
    routine: input.routine?.trim() || null,
    label: input.label?.trim() || null,
    source: input.source?.trim() || null,
    updatedAt: input.updatedAt?.trim() || new Date().toISOString(),
  }
}

function buildDemoUserState(input: {
  pregnancyStatus: SharedDemoState['pregnancyStatus']
  role: SharedDemoState['role']
  pregnancyWeek: number
  babyName: string
  source?: string | null
  updatedAt?: string | null
}): SharedDemoUserState {
  return {
    pregnancyStatus: input.pregnancyStatus,
    role: input.role,
    pregnancyWeek: normalizeDemoPregnancyWeek(input.pregnancyWeek),
    babyName: normalizeDemoBabyName(input.babyName),
    source: input.source?.trim() || null,
    updatedAt: input.updatedAt?.trim() || new Date().toISOString(),
  }
}

function stateFromSignals(signals: unknown, createdAt?: string): SharedDemoState {
  const value = signals && typeof signals === 'object' ? signals as Partial<SharedDemoState> : {}
  const incomingUserState = normalizeSharedDemoUserState(value.userState)
  const pregnancyStatus = isDemoPregnancyStatus(value.pregnancyStatus)
    ? value.pregnancyStatus
    : incomingUserState?.pregnancyStatus ?? DEFAULT_SHARED_DEMO_STATE.pregnancyStatus
  const pregnancyWeek = normalizeDemoPregnancyWeek(
    value.pregnancyWeek ?? incomingUserState?.pregnancyWeek,
    DEFAULT_SHARED_DEMO_STATE.pregnancyWeek,
  )
  const role = isDemoRole(value.role) ? value.role : incomingUserState?.role ?? DEFAULT_SHARED_DEMO_STATE.role
  const babyName = normalizeDemoBabyName(value.babyName ?? incomingUserState?.babyName, DEFAULT_SHARED_DEMO_STATE.babyName)
  const fallbackUserState = buildDemoUserState({
    pregnancyStatus,
    role,
    pregnancyWeek,
    babyName,
    source: STATE_SOURCE,
    updatedAt: typeof value.lastUpdated === 'string' ? value.lastUpdated : createdAt,
  })

  return {
    pregnancyStatus,
    pregnancyWeek,
    role,
    babyName,
    userState: normalizeSharedDemoUserState(value.userState, fallbackUserState),
    currentRoutine: typeof value.currentRoutine === 'string' ? value.currentRoutine : null,
    simulationRoutine: typeof value.simulationRoutine === 'string'
      ? value.simulationRoutine
      : null,
    demoMode: normalizeSharedDemoModeState(value.demoMode),
    latestHubInput: typeof value.latestHubInput === 'string' ? value.latestHubInput : null,
    latestCareModeLabel: typeof value.latestCareModeLabel === 'string'
      ? value.latestCareModeLabel
      : null,
    latestVoiceCommand: normalizeSharedDemoVoiceCommand(value.latestVoiceCommand),
    hubListening: normalizeSharedDemoHubListeningState(value.hubListening),
    preparationMode: normalizePreparationMode(value.preparationMode),
    lightPower: isDemoLightPower(value.lightPower) ? value.lightPower : DEFAULT_SHARED_DEMO_STATE.lightPower,
    careState: isDemoCareState(value.careState) ? value.careState : DEFAULT_SHARED_DEMO_STATE.careState,
    careUpdatedAt: typeof value.careUpdatedAt === 'string' ? value.careUpdatedAt : null,
    diaryEntries: normalizeDiaryEntries(value.diaryEntries),
    lastUpdated: typeof value.lastUpdated === 'string'
      ? value.lastUpdated
      : createdAt ?? DEFAULT_SHARED_DEMO_STATE.lastUpdated,
  }
}

async function fetchState() {
  const supabase = getClient()
  if (!supabase) {
    return {
      state: DEFAULT_SHARED_DEMO_STATE,
      care: null,
      snapshotCareIsNewer: false,
      configured: false,
    }
  }

  const [stateResult, careResult, diaryResult] = await Promise.all([
    supabase
      .from('mode_runs')
      .select('id, mode, mode_label, input_text, reply, wife_card, source, signals, created_at')
      .eq('source', STATE_SOURCE)
      .eq('mode', STATE_MODE)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<ModeRunRow>(),
    supabase
      .from('mode_runs')
      .select('id, mode, mode_label, input_text, reply, wife_card, source, signals, created_at')
      .in('source', CARE_SOURCES)
      .neq('mode', STATE_MODE)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('diary_entries')
      .select('id, title, content, pregnancy_week, baby_name, source_summary, used_modes, created_at')
      .order('created_at', { ascending: false })
      .limit(40),
  ])

  if (stateResult.error) console.warn('[demo-state] snapshot read failed:', stateResult.error)
  if (careResult.error) console.warn('[demo-state] care read failed:', careResult.error)
  if (diaryResult.error) console.warn('[demo-state] diary read failed:', diaryResult.error)

  const snapshot = stateFromSignals(stateResult.data?.signals, stateResult.data?.created_at)
  const remoteEntries = (diaryResult.data ?? []) as DiaryEntry[]
  const mergedEntries = new Map<string, DiaryEntry>()
  for (const entry of [...remoteEntries, ...snapshot.diaryEntries]) mergedEntries.set(entry.id, entry)

  const careRows = (careResult.data ?? []) as ModeRunRow[]
  const care = careRows.find((row) => careMatchesSnapshot(row, snapshot)) ?? null
  const careTimestamp = care?.created_at ? Date.parse(care.created_at) : 0
  const snapshotCareTimestamp = snapshot.careUpdatedAt
    ? Date.parse(snapshot.careUpdatedAt)
    : 0
  const careIsNewer =
    Boolean(care?.created_at) &&
    careTimestamp > snapshotCareTimestamp
  const snapshotCareIsNewer =
    Boolean(snapshot.careUpdatedAt) &&
    snapshotCareTimestamp >= careTimestamp
  const careSimulationRoutine = careIsNewer
    ? hubModeToSimulationRoutine(care?.mode, {
        inputText: care?.input_text ?? undefined,
      })
    : null
  const careDemoMode = careIsNewer && care
    ? buildDemoModeState({
        mode: care.mode,
        routine: careSimulationRoutine,
        label: care.mode_label ?? care.mode,
        source: care.source,
        updatedAt: care.created_at,
      })
    : null
  const state: SharedDemoState = {
    ...snapshot,
    currentRoutine: careIsNewer ? care?.mode ?? null : snapshot.currentRoutine,
    simulationRoutine: careIsNewer
      ? careSimulationRoutine
      : snapshot.simulationRoutine,
    demoMode: careDemoMode ?? snapshot.demoMode,
    latestHubInput: careIsNewer
      ? care?.input_text?.trim() || null
      : snapshot.latestHubInput,
    latestCareModeLabel: careIsNewer
      ? care?.mode_label?.trim() || care?.mode || null
      : snapshot.latestCareModeLabel,
    careState: careIsNewer ? 'completed' : snapshot.careState,
    diaryEntries: Array.from(mergedEntries.values())
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    lastUpdated: [snapshot.lastUpdated, care?.created_at]
      .filter(Boolean)
      .sort()
      .at(-1) ?? snapshot.lastUpdated,
  }

  return { state, care, snapshotCareIsNewer, configured: true }
}

export async function GET() {
  const result = await fetchState()
  const care = result.care
  const useSnapshotCare = result.snapshotCareIsNewer
  const demoMode = result.state.demoMode
  const eventMode = demoMode?.mode ?? (useSnapshotCare ? result.state.currentRoutine : care?.mode ?? result.state.currentRoutine)
  const eventCreatedAt = useSnapshotCare
    ? demoMode?.updatedAt ?? result.state.careUpdatedAt ?? result.state.lastUpdated
    : care?.created_at ?? result.state.lastUpdated

  return noStore({
    configured: result.configured,
    realtime: result.configured
      ? {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          table: 'mode_runs',
          source: STATE_SOURCE,
          mode: STATE_MODE,
        }
      : null,
    state: {
      ...result.state,
      id: useSnapshotCare
        ? `snapshot-care-${result.state.careUpdatedAt}`
        : care?.id ?? `snapshot-${result.state.lastUpdated}`,
      mode: eventMode,
      modeLabel: demoMode?.label ?? (useSnapshotCare ? result.state.latestCareModeLabel : care?.mode_label ?? null),
      routineId: hubModeToSimulationRoutine(eventMode, {
        inputText: useSnapshotCare ? undefined : care?.input_text ?? undefined,
      }) ?? demoMode?.routine ?? result.state.simulationRoutine,
      source: demoMode?.source ?? (useSnapshotCare ? STATE_SOURCE : care?.source ?? STATE_SOURCE),
      createdAt: eventCreatedAt,
      updatedAt: demoMode?.updatedAt ?? result.state.lastUpdated,
      latestCareAdvice: !care
        ? null
        : {
            mode: care.mode,
            modeLabel: care.mode_label,
            inputText: care.input_text,
            advice: care.wife_card || care.reply,
            createdAt: care.created_at,
          },
    },
  })
}

export async function PATCH(request: Request) {
  const supabase = getClient()
  if (!supabase) return noStore({ error: 'Supabase shared demo state is not configured.' }, 503)

  const body = (await request.json().catch(() => ({}))) as Partial<SharedDemoState>
  const current = (await fetchState()).state
  const updatedAt = new Date().toISOString()
  const careChanged =
    body.currentRoutine !== undefined ||
    body.lightPower !== undefined ||
    body.careState !== undefined ||
    body.latestVoiceCommand !== undefined ||
    body.demoMode !== undefined
  const userChanged =
    body.pregnancyStatus !== undefined ||
    body.role !== undefined ||
    body.pregnancyWeek !== undefined ||
    body.babyName !== undefined ||
    body.userState !== undefined
  const incomingDemoMode = normalizeSharedDemoModeState(body.demoMode)
  const nextDemoMode = body.demoMode === null
    ? null
    : body.demoMode !== undefined
      ? buildDemoModeState({
          mode: incomingDemoMode?.mode ?? body.currentRoutine ?? current.currentRoutine,
          routine: incomingDemoMode?.routine ?? body.simulationRoutine ?? current.simulationRoutine,
          label: incomingDemoMode?.label ?? body.latestCareModeLabel ?? current.latestCareModeLabel,
          source: incomingDemoMode?.source ?? body.latestVoiceCommand?.source ?? current.latestVoiceCommand?.source ?? STATE_SOURCE,
          updatedAt,
        })
      : careChanged
        ? buildDemoModeState({
            mode: body.currentRoutine === undefined ? current.currentRoutine : body.currentRoutine,
            routine: body.simulationRoutine === undefined ? current.simulationRoutine : body.simulationRoutine,
            label: body.latestCareModeLabel === undefined ? current.latestCareModeLabel : body.latestCareModeLabel,
            source: body.latestVoiceCommand?.source ?? current.latestVoiceCommand?.source ?? STATE_SOURCE,
            updatedAt,
          })
        : current.demoMode
  const incomingUserState = normalizeSharedDemoUserState(body.userState, current.userState)
  const nextPregnancyStatus = isDemoPregnancyStatus(body.pregnancyStatus)
    ? body.pregnancyStatus
    : incomingUserState?.pregnancyStatus ?? current.pregnancyStatus
  const nextPregnancyWeek = normalizeDemoPregnancyWeek(
    body.pregnancyWeek ?? incomingUserState?.pregnancyWeek,
    current.pregnancyWeek,
  )
  const nextRole = isDemoRole(body.role)
    ? body.role
    : incomingUserState?.role ?? current.role
  const nextBabyName = normalizeDemoBabyName(
    body.babyName ?? incomingUserState?.babyName,
    current.babyName,
  )
  const nextUserState = userChanged
    ? buildDemoUserState({
        pregnancyStatus: nextPregnancyStatus,
        role: nextRole,
        pregnancyWeek: nextPregnancyWeek,
        babyName: nextBabyName,
        source: incomingUserState?.source ?? body.latestVoiceCommand?.source ?? STATE_SOURCE,
        updatedAt,
      })
    : current.userState
  const next: SharedDemoState = {
    pregnancyStatus: nextPregnancyStatus,
    pregnancyWeek: nextPregnancyWeek,
    role: nextRole,
    babyName: nextBabyName,
    userState: nextUserState,
    currentRoutine: body.currentRoutine === null || typeof body.currentRoutine === 'string'
      ? body.currentRoutine
      : current.currentRoutine,
    simulationRoutine: body.simulationRoutine === null || typeof body.simulationRoutine === 'string'
      ? body.simulationRoutine
      : current.simulationRoutine,
    demoMode: nextDemoMode,
    latestHubInput: body.latestHubInput === null || typeof body.latestHubInput === 'string'
      ? body.latestHubInput
      : current.latestHubInput,
    latestCareModeLabel: body.latestCareModeLabel === null || typeof body.latestCareModeLabel === 'string'
      ? body.latestCareModeLabel
      : current.latestCareModeLabel,
    latestVoiceCommand: body.latestVoiceCommand === undefined
      ? current.latestVoiceCommand
      : normalizeSharedDemoVoiceCommand(body.latestVoiceCommand),
    hubListening: body.hubListening === undefined
      ? current.hubListening
      : normalizeSharedDemoHubListeningState(body.hubListening),
    preparationMode: body.preparationMode === undefined
      ? current.preparationMode
      : normalizePreparationMode(body.preparationMode),
    lightPower: body.lightPower === undefined
      ? current.lightPower
      : isDemoLightPower(body.lightPower)
        ? body.lightPower
        : current.lightPower,
    careState: isDemoCareState(body.careState) ? body.careState : current.careState,
    careUpdatedAt: careChanged ? updatedAt : current.careUpdatedAt,
    diaryEntries: body.diaryEntries === undefined
      ? current.diaryEntries
      : normalizeDiaryEntries(body.diaryEntries),
    lastUpdated: updatedAt,
  }

  const { error } = await supabase.from('mode_runs').insert({
    mode: STATE_MODE,
    mode_label: '공유 시연 상태',
    source: STATE_SOURCE,
    input_text: 'shared-demo-state',
    signals: next,
    reply: '',
    wife_card: '',
    husband_card: '',
    device_results: [],
  })

  if (error) {
    console.warn('[demo-state] snapshot write failed:', error)
    return noStore({ error: '공유 시연 상태를 저장하지 못했습니다.' }, 502)
  }

  return noStore({ state: next })
}

export async function POST(request: Request) {
  return PATCH(request)
}
