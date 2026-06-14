import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { hubModeToSimulationRoutine } from '@/lib/simulation-routine-bridge'
import {
  DEFAULT_SHARED_DEMO_STATE,
  isDemoCareState,
  isDemoPregnancyStatus,
  isDemoRole,
  normalizePreparationMode,
  normalizeDemoPregnancyWeek,
  normalizeDiaryEntries,
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

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key ? createClient(url, key) : null
}

function noStore<T>(body: T, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}

function stateFromSignals(signals: unknown, createdAt?: string): SharedDemoState {
  const value = signals && typeof signals === 'object' ? signals as Partial<SharedDemoState> : {}
  return {
    pregnancyStatus: isDemoPregnancyStatus(value.pregnancyStatus)
      ? value.pregnancyStatus
      : DEFAULT_SHARED_DEMO_STATE.pregnancyStatus,
    pregnancyWeek: normalizeDemoPregnancyWeek(
      value.pregnancyWeek,
      DEFAULT_SHARED_DEMO_STATE.pregnancyWeek,
    ),
    role: isDemoRole(value.role) ? value.role : DEFAULT_SHARED_DEMO_STATE.role,
    currentRoutine: typeof value.currentRoutine === 'string' ? value.currentRoutine : null,
    simulationRoutine: typeof value.simulationRoutine === 'string'
      ? value.simulationRoutine
      : null,
    latestHubInput: typeof value.latestHubInput === 'string' ? value.latestHubInput : null,
    latestCareModeLabel: typeof value.latestCareModeLabel === 'string'
      ? value.latestCareModeLabel
      : null,
    preparationMode: normalizePreparationMode(value.preparationMode),
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
  const state: SharedDemoState = {
    ...snapshot,
    currentRoutine: careIsNewer ? care?.mode ?? null : snapshot.currentRoutine,
    simulationRoutine: careIsNewer
      ? careSimulationRoutine
      : snapshot.simulationRoutine,
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
  const eventMode = useSnapshotCare ? result.state.currentRoutine : care?.mode ?? result.state.currentRoutine
  const eventCreatedAt = useSnapshotCare
    ? result.state.careUpdatedAt ?? result.state.lastUpdated
    : care?.created_at ?? result.state.lastUpdated

  return noStore({
    configured: result.configured,
    state: {
      ...result.state,
      id: useSnapshotCare
        ? `snapshot-care-${result.state.careUpdatedAt}`
        : care?.id ?? `snapshot-${result.state.lastUpdated}`,
      mode: eventMode,
      modeLabel: useSnapshotCare ? null : care?.mode_label ?? null,
      routineId: hubModeToSimulationRoutine(eventMode, {
        inputText: useSnapshotCare ? undefined : care?.input_text ?? undefined,
      }) ?? result.state.simulationRoutine,
      source: useSnapshotCare ? STATE_SOURCE : care?.source ?? STATE_SOURCE,
      createdAt: eventCreatedAt,
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
    body.careState !== undefined
  const next: SharedDemoState = {
    pregnancyStatus: isDemoPregnancyStatus(body.pregnancyStatus)
      ? body.pregnancyStatus
      : current.pregnancyStatus,
    pregnancyWeek: normalizeDemoPregnancyWeek(body.pregnancyWeek, current.pregnancyWeek),
    role: isDemoRole(body.role) ? body.role : current.role,
    currentRoutine: body.currentRoutine === null || typeof body.currentRoutine === 'string'
      ? body.currentRoutine
      : current.currentRoutine,
    simulationRoutine: body.simulationRoutine === null || typeof body.simulationRoutine === 'string'
      ? body.simulationRoutine
      : current.simulationRoutine,
    latestHubInput: body.latestHubInput === null || typeof body.latestHubInput === 'string'
      ? body.latestHubInput
      : current.latestHubInput,
    latestCareModeLabel: body.latestCareModeLabel === null || typeof body.latestCareModeLabel === 'string'
      ? body.latestCareModeLabel
      : current.latestCareModeLabel,
    preparationMode: body.preparationMode === undefined
      ? current.preparationMode
      : normalizePreparationMode(body.preparationMode),
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
