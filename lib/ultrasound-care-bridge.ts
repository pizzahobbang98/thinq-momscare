import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { resolveUltrasoundBabyName, resolveUltrasoundPregnancyWeek } from '@/lib/ultrasound-defaults'

/** 입덧/수면 등 케어 모드와 분리된 성장 기록 전용 mode */
export const ULTRASOUND_GROWTH_MODE = 'ULTRASOUND_GROWTH'
export const ULTRASOUND_GROWTH_MODE_LABEL = '엄마품 · 성장 기록'

export const ULTRASOUND_GROWTH_CARE_STORAGE_KEY = 'thinq-ultrasound-growth-care-runs'
export const ULTRASOUND_GROWTH_CARE_CHANGE_EVENT = 'thinq-ultrasound-growth-care-change'

export type UltrasoundGrowthModeRun = {
  id: string
  mode: typeof ULTRASOUND_GROWTH_MODE
  mode_label: string
  created_at: string
  wife_card: string
  husband_card: string
  reply: string
  input_text: string | null
  signals: string[]
  device_results: []
  source: 'ultrasound'
  pregnancyWeek: number
  babyName: string
}

export function buildWifeUltrasoundGrowthCard(
  pregnancyWeek: number | null | undefined,
  babyName: string | null | undefined,
) {
  const week = resolveUltrasoundPregnancyWeek(pregnancyWeek)
  const name = resolveUltrasoundBabyName(babyName)
  return `오늘의 성장 기록이 추가됐어요 · ${week}주차 ${name}`
}

export const HUSBAND_ULTRASOUND_GROWTH_SUGGESTION =
  '오늘 새 성장 기록이 남았어요. 저녁에 함께 사진 보며 한마디 건네보세요.'

export function buildUltrasoundGrowthModeRun(options: {
  id?: string
  pregnancyWeek: number | null | undefined
  babyName: string | null | undefined
  createdAt?: string
}): UltrasoundGrowthModeRun {
  const pregnancyWeek = resolveUltrasoundPregnancyWeek(options.pregnancyWeek)
  const babyName = resolveUltrasoundBabyName(options.babyName)
  const wifeCard = buildWifeUltrasoundGrowthCard(pregnancyWeek, babyName)

  return {
    id: options.id ?? `ultrasound-growth-${Date.now()}`,
    mode: ULTRASOUND_GROWTH_MODE,
    mode_label: ULTRASOUND_GROWTH_MODE_LABEL,
    created_at: options.createdAt ?? new Date().toISOString(),
    wife_card: wifeCard,
    husband_card: HUSBAND_ULTRASOUND_GROWTH_SUGGESTION,
    reply: wifeCard,
    input_text: '초음파 성장 기록 저장',
    signals: ['성장 기록', '초음파'],
    device_results: [],
    source: 'ultrasound',
    pregnancyWeek,
    babyName,
  }
}

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function readUltrasoundGrowthCareRuns(): UltrasoundGrowthModeRun[] {
  try {
    const storage = getStorage()
    if (!storage) return []

    const raw = storage.getItem(ULTRASOUND_GROWTH_CARE_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as UltrasoundGrowthModeRun[]
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn('[ultrasound-care-bridge] read failed', error)
    return []
  }
}

export function saveUltrasoundGrowthCareLocally(run: UltrasoundGrowthModeRun) {
  const storage = getStorage()
  if (!storage) return

  const next = [run, ...readUltrasoundGrowthCareRuns().filter((item) => item.id !== run.id)].slice(
    0,
    20,
  )
  storage.setItem(ULTRASOUND_GROWTH_CARE_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(ULTRASOUND_GROWTH_CARE_CHANGE_EVENT, { detail: run }))
}

export function mergeUltrasoundGrowthRuns<T extends { id: string; mode: string; created_at: string }>(
  modeRuns: T[],
  growthRuns: UltrasoundGrowthModeRun[] = readUltrasoundGrowthCareRuns(),
): T[] {
  const growthAsRuns = growthRuns as unknown as T[]
  const seen = new Set(modeRuns.map((run) => run.id))
  const merged = [...modeRuns]

  for (const run of growthAsRuns) {
    if (seen.has(run.id)) continue
    merged.push(run)
  }

  return merged.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export async function insertUltrasoundGrowthModeRun(
  supabase: SupabaseClient,
  demoWifeId: string,
  options: {
    id?: string
    pregnancyWeek: number | null | undefined
    babyName: string | null | undefined
  },
) {
  const run = buildUltrasoundGrowthModeRun(options)

  const { error } = await supabase.from('mode_runs').insert({
    id: run.id,
    user_id: demoWifeId,
    mode: run.mode,
    mode_label: run.mode_label,
    source: run.source,
    input_text: run.input_text,
    signals: run.signals,
    reply: run.reply,
    wife_card: run.wife_card,
    husband_card: run.husband_card,
    device_results: run.device_results,
    created_at: run.created_at,
  })

  if (error) {
    console.warn('[ultrasound-care-bridge] mode_runs insert failed:', error.message)
    return null
  }

  const { error: messageError } = await supabase.from('messages').insert({
    from_role: 'system',
    content: run.husband_card,
  })

  if (messageError) {
    console.warn('[ultrasound-care-bridge] husband message insert failed:', messageError.message)
  }

  return run
}

export async function syncUltrasoundGrowthCareFromAnalyze(options: {
  pregnancyWeek: number | null | undefined
  babyName: string | null | undefined
  recordId?: string
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const demoWifeId = process.env.NEXT_PUBLIC_DEMO_WIFE_ID

  if (!supabaseUrl || !supabaseKey || !demoWifeId) return null

  const supabase = createClient(supabaseUrl, supabaseKey)
  return insertUltrasoundGrowthModeRun(supabase, demoWifeId, {
    id: options.recordId ? `ultrasound-${options.recordId}` : undefined,
    pregnancyWeek: options.pregnancyWeek,
    babyName: options.babyName,
  })
}
