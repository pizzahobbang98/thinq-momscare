import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { OPENAI_MODELS } from '@/lib/openai-models'
import { calculateCurrentWeeksFromDueDate } from '@/lib/pregnancy'
import {
  buildFallbackDiary,
  buildGptUserPrompt,
  DIARY_SYSTEM_PROMPT,
  PREPARING_DIARY_SYSTEM_PROMPT,
  PREGNANT_HUSBAND_DIARY_SYSTEM_PROMPT,
  getSevenDaysAgoISO,
  mergeDiaryModeRuns,
  parseGptDiaryResponse,
  type DiaryContext,
  type DiaryGenerateResult,
  type DiaryModeRun,
  type DiarySymptomLog,
  type DiaryDeviceEvent,
  type DiaryUltrasoundRecord,
  type DiaryMoodRecord,
} from '@/lib/diary'
import type { DiaryGenerateRequest, DiaryGenerateResponse } from '@/lib/diary-types'

const HUB_CONVERSATION_SOURCES = [
  'hub_voice',
  'hub_text',
  'voice',
  'text',
  'hub',
  'example_chip_mobile',
]

async function safeQuery<T>(label: string, query: PromiseLike<{ data: T | null; error: unknown }>) {
  try {
    const { data, error } = await query
    if (error) {
      console.warn(`${label} 조회 실패:`, error)
      return [] as unknown as T
    }
    return (data ?? []) as unknown as T
  } catch (error) {
    console.warn(`${label} 조회 예외:`, error)
    return [] as unknown as T
  }
}

function isPreparingModeRun(run: DiaryModeRun) {
  const signals = Array.isArray(run.signals) ? run.signals : []
  return signals.includes('상태:preparing') || signals.includes('임신 준비')
}

function modeRunMatchesRole(run: DiaryModeRun, role: 'wife' | 'husband') {
  const signals = Array.isArray(run.signals) ? run.signals : []
  if (role === 'husband') return signals.includes('역할:husband')
  return !signals.includes('역할:husband')
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const demoWifeId = process.env.NEXT_PUBLIC_DEMO_WIFE_ID
  const apiKey = process.env.OPENAI_API_KEY

  let pregnancyWeek: number | null = null
  let babyName: string | null = null
  let pregnancyStatus: 'preparing' | 'pregnant' = 'pregnant'
  let role: 'wife' | 'husband' = 'wife'

  try {
    const body = (await request.json().catch(() => ({}))) as DiaryGenerateRequest
    pregnancyStatus = body.pregnancyStatus === 'preparing' ? 'preparing' : 'pregnant'
    role = body.role === 'husband' ? 'husband' : 'wife'

    if (body.pregnancyWeek && body.pregnancyWeek >= 1 && body.pregnancyWeek <= 42) {
      pregnancyWeek = Math.round(body.pregnancyWeek)
    }
    babyName = body.babyName?.trim() || null

    const since = getSevenDaysAgoISO()
    const supabase =
      supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

    if (supabase && demoWifeId && (!pregnancyWeek || !babyName)) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('due_date, name')
          .eq('role', 'wife')
          .maybeSingle()

        if (!pregnancyWeek && userData?.due_date) {
          pregnancyWeek = calculateCurrentWeeksFromDueDate(userData.due_date)
        }
        if (!babyName && userData?.name) {
          babyName = userData.name.trim() || null
        }
      } catch (error) {
        console.warn('공유 임신 프로필 조회 실패:', error)
      }
    }

    let modeRuns: DiaryModeRun[] = []
    let symptomLogs: DiarySymptomLog[] = []
    let deviceEvents: DiaryDeviceEvent[] = []
    let ultrasoundRecords: DiaryUltrasoundRecord[] = []
    let moods: DiaryMoodRecord[] = []

    const clientHubCareLogs = (body.hubCareLogs ?? []).filter(
      (run) => run?.mode && run?.created_at,
    )

    if (supabase && demoWifeId) {
      const remoteModeRuns = await safeQuery<DiaryModeRun[]>('mode_runs', supabase
        .from('mode_runs')
        .select(
          'mode, mode_label, input_text, signals, reply, wife_card, husband_card, device_results, created_at',
        )
        .in('source', HUB_CONVERSATION_SOURCES)
        .not('input_text', 'is', null)
        .neq('input_text', '')
        .gte('created_at', since)
        .order('created_at', { ascending: false }))

      const statusScopedRemoteRuns = remoteModeRuns.filter((run) =>
        (pregnancyStatus === 'preparing' ? isPreparingModeRun(run) : !isPreparingModeRun(run))
        && modeRunMatchesRole(run, role),
      )
      modeRuns = mergeDiaryModeRuns(statusScopedRemoteRuns, clientHubCareLogs)

      symptomLogs = await safeQuery<DiarySymptomLog[]>('symptom_logs', supabase
        .from('symptom_logs')
        .select('symptom_text, parsed_category, severity, created_at')
        .eq('user_id', demoWifeId)
        .gte('created_at', since)
        .neq('parsed_category', 'AUTO_DIARY')
        .order('created_at', { ascending: false }))

      deviceEvents = await safeQuery<DiaryDeviceEvent[]>('device_events', supabase
        .from('device_events')
        .select('event_type, triggered_by, device_status, created_at')
        .eq('user_id', demoWifeId)
        .gte('created_at', since)
        .order('created_at', { ascending: false }))

      ultrasoundRecords = await safeQuery<DiaryUltrasoundRecord[]>('ultrasound_records', supabase
        .from('ultrasound_records')
        .select('fruit_name, weeks, description, ai_message, created_at')
        .eq('user_id', demoWifeId)
        .gte('created_at', since)
        .order('created_at', { ascending: false }))

      moods = await safeQuery<DiaryMoodRecord[]>('moods', supabase
        .from('moods')
        .select('mood, emoji, created_at')
        .eq('user_id', demoWifeId)
        .gte('created_at', since)
        .order('created_at', { ascending: false }))
    } else if (clientHubCareLogs.length > 0) {
      modeRuns = mergeDiaryModeRuns([], clientHubCareLogs)
    }

    const context: DiaryContext = {
      pregnancyStatus,
      role,
      pregnancyWeek,
      babyName,
      modeRuns,
      symptomLogs,
      deviceEvents,
      ultrasoundRecords,
      moods,
    }

    let generated: DiaryGenerateResult = buildFallbackDiary(context)

    if (apiKey) {
      try {
        const openai = new OpenAI({ apiKey })
        const completion = await openai.chat.completions.create({
          model: OPENAI_MODELS.text,
          messages: [
            {
              role: 'system',
              content: pregnancyStatus === 'preparing'
                ? PREPARING_DIARY_SYSTEM_PROMPT
                : role === 'husband'
                  ? PREGNANT_HUSBAND_DIARY_SYSTEM_PROMPT
                : DIARY_SYSTEM_PROMPT,
            },
            { role: 'user', content: buildGptUserPrompt(context) },
          ],
          response_format: { type: 'json_object' },
        })

        const content = completion.choices[0]?.message?.content
        if (content) {
          const parsed = parseGptDiaryResponse(content, context)
          if (parsed) generated = parsed
        }
      } catch (error) {
        console.warn('GPT 다이어리 생성 실패, fallback 사용:', error)
      }
    }

    let recordId: string | undefined
    let savedToDb = false

    if (supabase && demoWifeId) {
      const sourcePayload = JSON.stringify({
        summary: generated.summary,
        ...JSON.parse(generated.sourceSummary),
      })

      const baseRecord = {
        user_id: demoWifeId,
        title: generated.title,
        content: generated.content,
        pregnancy_week: pregnancyWeek,
        baby_name: babyName,
        source_summary: sourcePayload,
        used_modes: generated.usedModes,
      }

      const insertResult = await supabase
        .from('diary_entries')
        .insert(baseRecord)
        .select('id, title, content, pregnancy_week, baby_name, source_summary, used_modes, created_at')
        .single()

      if (insertResult.error) {
        console.warn('diary_entries 저장 실패, symptom_logs fallback 시도:', insertResult.error.message)

        const legacyInsert = await supabase.from('symptom_logs').insert({
          user_id: demoWifeId,
          symptom_text: generated.content,
          parsed_category: 'AUTO_DIARY',
        })

        if (!legacyInsert.error) {
          savedToDb = true
        }
      } else {
        savedToDb = true
        recordId = insertResult.data?.id as string | undefined
      }
    }

    const response: DiaryGenerateResponse = {
      success: true,
      entry: {
        id: recordId ?? `demo-${Date.now()}`,
        title: generated.title,
        content: generated.content,
        summary: generated.summary,
        pregnancy_week: pregnancyWeek,
        baby_name: babyName,
        source_summary: generated.sourceSummary,
        used_modes: generated.usedModes,
        created_at: new Date().toISOString(),
        is_demo: !savedToDb,
      },
      savedToDb,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('다이어리 generate API 처리 실패:', error)

    const fallbackContext: DiaryContext = {
      pregnancyStatus,
      role,
      pregnancyWeek,
      babyName,
      modeRuns: [],
      symptomLogs: [],
      deviceEvents: [],
      ultrasoundRecords: [],
      moods: [],
    }
    const fallback = buildFallbackDiary(fallbackContext)

    const response: DiaryGenerateResponse = {
      success: true,
      entry: {
        id: `demo-${Date.now()}`,
        title: fallback.title,
        content: fallback.content,
        summary: fallback.summary,
        pregnancy_week: pregnancyWeek,
        baby_name: babyName,
        source_summary: fallback.sourceSummary,
        used_modes: fallback.usedModes,
        created_at: new Date().toISOString(),
        is_demo: true,
      },
      savedToDb: false,
      error: '일부 기능을 시연용 기본값으로 대체했어요.',
    }

    return NextResponse.json(response)
  }
}
