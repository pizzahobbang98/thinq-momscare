import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { hubModeToSimulationRoutine } from '@/lib/simulation-routine-bridge'
import {
  DEFAULT_SHARED_DEMO_STATE,
  isDemoCareState,
  isDemoPregnancyStatus,
  isDemoRole,
  normalizeDiaryEntries,
  type SharedDemoState,
} from '@/lib/shared-demo-state'
import type { DiaryEntry } from '@/lib/supabase'

const CARE_SOURCES = ['hub_voice', 'hub_text', 'voice', 'text', 'hub', 'example_chip_mobile']
const STATE_SOURCE = 'demo_state'
const STATE_MODE = 'DEMO_STATE'

type ModeRunRow = {
  id: string
  mode: string
  mode_label: string | null
  input_text: string | null
  source: string | null
  signals: unknown
  created_at: string
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
    role: isDemoRole(value.role) ? value.role : DEFAULT_SHARED_DEMO_STATE.role,
    currentRoutine: typeof value.currentRoutine === 'string' ? value.currentRoutine : null,
    careState: isDemoCareState(value.careState) ? value.careState : DEFAULT_SHARED_DEMO_STATE.careState,
    diaryEntries: normalizeDiaryEntries(value.diaryEntries),
    lastUpdated: typeof value.lastUpdated === 'string'
      ? value.lastUpdated
      : createdAt ?? DEFAULT_SHARED_DEMO_STATE.lastUpdated,
  }
}

async function fetchState() {
  const supabase = getClient()
  if (!supabase) return { state: DEFAULT_SHARED_DEMO_STATE, care: null, configured: false }

  const [stateResult, careResult, diaryResult] = await Promise.all([
    supabase
      .from('mode_runs')
      .select('id, mode, mode_label, input_text, source, signals, created_at')
      .eq('source', STATE_SOURCE)
      .eq('mode', STATE_MODE)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<ModeRunRow>(),
    supabase
      .from('mode_runs')
      .select('id, mode, mode_label, input_text, source, signals, created_at')
      .in('source', CARE_SOURCES)
      .neq('mode', STATE_MODE)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<ModeRunRow>(),
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

  const care = careResult.data
  const careIsNewer =
    Boolean(care?.created_at) &&
    Date.parse(care!.created_at) > Date.parse(snapshot.lastUpdated)
  const state: SharedDemoState = {
    ...snapshot,
    currentRoutine: care?.mode ?? snapshot.currentRoutine,
    careState: careIsNewer ? 'completed' : snapshot.careState,
    diaryEntries: Array.from(mergedEntries.values())
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    lastUpdated: [snapshot.lastUpdated, care?.created_at]
      .filter(Boolean)
      .sort()
      .at(-1) ?? snapshot.lastUpdated,
  }

  return { state, care, configured: true }
}

export async function GET() {
  const result = await fetchState()
  const care = result.care

  return noStore({
    configured: result.configured,
    state: {
      ...result.state,
      id: care?.id ?? `snapshot-${result.state.lastUpdated}`,
      mode: care?.mode ?? result.state.currentRoutine,
      modeLabel: care?.mode_label ?? null,
      routineId: hubModeToSimulationRoutine(care?.mode ?? result.state.currentRoutine, {
        inputText: care?.input_text ?? undefined,
      }),
      source: care?.source ?? STATE_SOURCE,
      createdAt: care?.created_at ?? result.state.lastUpdated,
    },
  })
}

export async function PATCH(request: Request) {
  const supabase = getClient()
  if (!supabase) return noStore({ error: 'Supabase shared demo state is not configured.' }, 503)

  const body = (await request.json().catch(() => ({}))) as Partial<SharedDemoState>
  const current = (await fetchState()).state
  const next: SharedDemoState = {
    pregnancyStatus: isDemoPregnancyStatus(body.pregnancyStatus)
      ? body.pregnancyStatus
      : current.pregnancyStatus,
    role: isDemoRole(body.role) ? body.role : current.role,
    currentRoutine: body.currentRoutine === null || typeof body.currentRoutine === 'string'
      ? body.currentRoutine
      : current.currentRoutine,
    careState: isDemoCareState(body.careState) ? body.careState : current.careState,
    diaryEntries: body.diaryEntries === undefined
      ? current.diaryEntries
      : normalizeDiaryEntries(body.diaryEntries),
    lastUpdated: new Date().toISOString(),
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
